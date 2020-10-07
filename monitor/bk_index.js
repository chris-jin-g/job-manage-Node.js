console.log('start scan logs file in folder _jobs')

var fs = require('fs')
var jobUtil = require('./job')
var utils = require('../common/utils')
var operation = require('./operation')
var when = require('when')
var alerter = require('./alerter')
var config = require('../config.json')

var LOG_DIR = __dirname + '/../_jobs'

var checkPidAlive = function (pid) {
    try {
        process.kill(pid, 0)
    } catch (err) {
        // no such pid alive
        return false
    }
    return true
}

var analyzeLog = function (content) {
    var result = null, item
    var detail = {}, temp
    var VAR_REG = /\{\{(.+)\}\}/g
    while ((result = VAR_REG.exec(content)) != null) {
        item = result[1].split('::')
        if (item.length >= 2) {
            detail[item[0]] = item[1]
        }
    }
    return detail
}

var updateJob = function (jobName, detail, jobConfig) {
    var promise = when.promise(function (resolve, reject, notify) {
        jobUtil.getJob(jobName).then(function (job) {
            if (!job) {
                // job not exist or job was waiting, did not need update
                // TODO: get all processiong job and then to read the logfile
                resolve()
                return
            }
            // update job with job config
            job.author = jobConfig.author
            job.frequency = jobConfig.frequency
            if (job.status == 'processing' && detail['PARTITION']) {
                // job is processing, update job with detail in log
                var currentPartitionTime = job.current_partition_time
                if (!currentPartitionTime) {
                    console.warn('current partition time is null')
                } else {
                    var currentPartion = utils.getPartitionByTime(job.frequency, job.current_partition_time)
                    if (currentPartion != detail['PARTITION']) {
                        job.status = 'error'
                        job.message = 'partition in log (' +
                            detail['PARTITION'] +
                            ') not same with partition in mongo(' +
                            currentPartion + ')'
                        console.error(job.message)
                    } else {
                        if (detail['JOB'] == 'START') {
                            job.pid = detail['PID']
                            if (checkPidAlive(job.pid)) {
                                job.status = 'processing'
                            } else {
                                job.status = 'dead'
                                console.error('job dead :', jobName)
                            }
                        } else if (detail['JOB'] == 'FAILED') {
                            job.status = 'failed'
                        } else if (detail['JOB'] == 'SUCCESS') {
                            job.status = 'success'
                            if (detail['PROCESSING_TIME']) {
                                if (job.average_processing_time) {
                                    job.average_processing_time =
                                        Math.ceil((parseInt(detail['PROCESSING_TIME']) + job.average_processing_time) / 2)
                                } else {
                                    job.average_processing_time = parseInt(detail['PROCESSING_TIME'])
                                }
                            }
                            job.current_partition_time = utils.getNextPartitionTimeByTime(job.frequency, job.current_partition_time)
                        }
                    }
                }
            }
            job.save(function (err) {
                if (err) {
                    console.error('save job error ', jobName)
                    reject(err)
                    return
                }
                resolve(job)
            })
        }, function (err) {
            console.warn('not find job of log file ',  jobName, err)
            resolve()
        })
    })
    return promise
}

var updateStatus = function (jobsConfig) {
    var promise = when.promise(function (resolve, reject, notify) {
        // this is a bkend process, we can use sync api
        var files = fs.readdirSync(LOG_DIR)
        if (!files) {
            reject(new Error('read log files error'))
            return
        }
        var ps = []
        for (var i = 0; i < files.length; i ++) {
            var fileName = files[i]
            if (!/\.log$/.test(fileName)) {
                continue
            }
            var jobName = fileName.replace(/\.log$/, '')
            if (!jobsConfig[jobName]) {
                continue
            }
            var jobConfig = jobsConfig[jobName]
            var fileContent = "" + fs.readFileSync(LOG_DIR + '/' + fileName)
            var logDetail = analyzeLog(fileContent)
            ps.push(updateJob(jobName, logDetail, jobConfig))
        }
        when.all(ps).then(function () {
            resolve()
        }, function (err) {
            reject(err)
        })
    })
    return promise
}

var isDepReady = function(job, jobsMap, jobConfig) {
    var dependencies = jobConfig.dependencies
    var allDepReady = true
    var partition = utils.getPartitionByTime(job.frequency, job.current_partition_time)
    var depJob, i, depPartion
    for (i = 0; i < dependencies.length; i ++) {
        depJob = jobsMap[dependencies[i].job]
        depPartion = utils.getPartitionByTime(job.frequency, depJob.current_partition_time)
        if (depPartion <= partition) {
            console.log(job.name, ' dependence ', depJob.name, ' not ready')
            allDepReady = false
            break
        }
    }
    return allDepReady
}

var isTimeReady = function(job, jobsMap) {
    var partition = utils.getPartitionByTime(job.frequency, job.current_partition_time)
    var nowPartition = utils.getPartitionByTime(job.frequency, job.end_partition_time || new Date())
    if (partition >= nowPartition) {
        return false
    } else {
        return true
    }
}

//
// check should start a new partition
//
var checkJobs = function (jobsConfig) {
    var promise = when.promise(function (resolve, reject, notify) {
        jobUtil.getAllJobs().then(function (jobs) {
            var job
            var jobsMap = {}
            for (var i = 0; i < jobs.length; i ++) {
                job = jobs[i]
                jobsMap[job.name] = job
            }
            var ps = []
            for (var i = 0; i < jobs.length; i ++) {
                job = jobs[i]
                if (job.status != 'waiting' && job.status != 'success') {
                    continue
                } else {
                    if (!jobsConfig[job.name]) {
                        console.warn('not find job config of :', job.name)
                        job.status = 'error'
                        job.message = 'not find job config'
                        ps.push(jobUtil.saveJob(job))
                    } else if(isTimeReady(job, jobsMap)) {
                        if (isDepReady(job, jobsMap, jobsConfig[job.name])) {
                            operation.startJob(job, job.current_partition_time)
                            job.status = 'processing'
                            ps.push(jobUtil.saveJob(job))
                        } else {
                            if (job.status != 'waiting') {
                                job.status = 'waiting'
                                ps.push(jobUtil.saveJob(job))
                            }
                        }
                    }
                }
            }
            when.all(ps).then(function () {
                resolve(jobs)
            }, function (err) {
                console.log(err)
                reject(err)
            })
        }, function (err) {
            reject(err)
        })
    })
    return promise
}

var updateAndCheckJobs = function (jobsConfig) {
    updateStatus(jobsConfig).then(function () {
        return checkJobs(jobsConfig)
    }, function (err) {
        console.error('bk server update job status failed', err)
    }).then(function (jobs) {
        setTimeout(function () {
            runBackendProcess()
        }, 10000)
    }, function (err) {
        console.error('check jobs error')
        console.log(err)
    })
}

var runBackendProcess = function () {
    console.log('bk process start')
    when.all([jobUtil.init(), utils.getAllJobsConfig()]).then(function (result) {
        var configs = result[1]
        var jobsConfig = {}
        for (var i = 0; i < configs.length; i ++) {
            jobsConfig[configs[i].jobName] = configs[i].config
        }
        updateAndCheckJobs(jobsConfig)
    }, function (err) {
        console.log('utils read all jobs config error')
        console.error(err)
    })
}

runBackendProcess()

setInterval(function () {
    jobUtil.getAllJobs().then(function (jobs) {
        alerter.checkAndAlertJobs(jobs)
    })
}, config.alertInterval * 1000)
