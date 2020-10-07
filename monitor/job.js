var config = require('../config.json')
var utils = require('../common/utils')
var mongoose = require('mongoose')
var when = require('when')

// init connect to mongodb
mongoose.connect(config.db, function (err) {
    if (err) {
        console.error('connect to %s error: ', config.db, err.message);
        process.exit(1);
    }
});
require('./model/job.js')
var Job = mongoose.model('Job')

var initJob = function (jobInfo) {
    var promise = when.promise(function (resolve, reject, notify) {
        Job.findOne({
            name: jobInfo.jobName
        }, function (err, job) {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            if (job) {
                // job already exist
                resolve(job)
                return
            }
            console.log('add a new job: ', jobInfo.jobName)
            var newJob = new Job()
            // default start from 3 hours ago
            newJob.current_partition_time = new Date(Date.now() - 1000 * 60 * 60 * 3)
            newJob.name = jobInfo.jobName
            if (jobInfo.config) {
                newJob.frequency = jobInfo.config.frequency
                newJob.author = jobInfo.config.author
                newJob.status = 'stop'
            }
            newJob.save(function (err) {
                if (err) {
                    console.error(err)
                    reject(err)
                    return
                }
                resolve(newJob)
            })
        })
    })
    return promise
}

var init = function () {
    var promise = when.promise(function (resolve, reject, notify) {
        utils.getAllJobsConfig().then(function (jobs) {
            var ps = []
            for (var i = 0; i < jobs.length; i ++) {
                ps.push(initJob(jobs[i]))
            }
            when.all(ps).then(function (jobs) {
                resolve(jobs)
            }, function (err) {
                reject(err)
            })
        }, function (err) {
            reject(err)
        }, function (err) {
            reject(err)
        })
    })
    return promise
}

exports.init = function () {
    // init jobs depends on job configs
    return init()
}

exports.getJob = function (jobName) {
    var promise = when.promise(function (resolve, reject, notify) {
        Job.findOne({ name: jobName }, function (err, job) {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            resolve(job)
        })
    })
    return promise
}

exports.getAllJobs = function () {
    var promise = when.promise(function (resolve, reject, notify) {
        Job.find({}, function (err, jobs) {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            resolve(jobs)
        })
    })
    return promise
}

exports.saveJob = function (job) {
    var promise = when.promise(function (resolve, reject, notify) {
        job.save(function (err) {
            if (err) {
                reject(err)
                return
            }
            resolve(job)
        })
    })
    return promise
}

exports.deleteJob = function (jobName) {
    var promise = when.promise(function (resolve, reject, notify) {
        Job.remove({name: jobName}, function (err) {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            resolve()
        })
    })
    return promise
}

exports.updateJob = function (jobName, newData) {
    var promise = when.promise(function (resolve, reject, notify) {
        Job.findOne({
            name: jobName
        }, function (err, job) {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            job.name.status = newData.status
            job.save(function (err) {
                if (err) {
                    reject(err)
                } else {
                    resolve(job)
                }
            })
        })
    })
    return promise
}
