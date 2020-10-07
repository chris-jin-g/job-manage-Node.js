
//
// This is a web server to manager and monitor jobs.
//

console.log('start running monitor')

var express = require('express')
var app = express()
var config = require('../config.json')
var jobUtil = require('./job')
var path = require('path')
var operation = require('./operation')
var utils = require('../common/utils')
var when = require('when')
var moment = require('moment')
var fs = require('fs')

var MAX_LOG_LENGTH = 10000

// static files forder
var staticDir = path.join(__dirname, 'public');
app.use('/public', express.static(staticDir));
app.set('views', path.join(__dirname, 'template'));
app.set('view engine', 'html');
app.engine('html', require('ejs-mate'));

app.get('/', function (req, res){
    jobUtil.getAllJobs().then(function (jobs) {
        res.render('index', {
            jobs: jobs,
            partition: utils.getPartitionByTime,
            formatTime: function (t) {
                return moment(t).format('YYYY-MM-DD HH:mm:ss')
            },
            formatDuration: utils.humanDuration
        })
    }, function (err) {
        res.redirect('error?msg=' + err)
    })
})

app.get('/error', function (req, res) {
    res.render('error', {
        message: req.query.msg
    })
})

app.get('/start', function (req, res) {
    var jobName = req.query.job_name
    var startPartition = req.query.partition
    console.log('start job: ', jobName, ' partition', startPartition)
    jobUtil.getJob(jobName).then(function (job) {
        if (job.status == 'stop' ||
            job.status == 'error' ||
            job.status == 'failed' ||
            job.status == 'dead') {
            job.status = 'waiting'
            job.start_time = new Date()
            if (startPartition && !utils.isPartitionLegal(job.frequency, startPartition)) {
                res.redirect('error?msg=partition is illegal')
                return
            }
            if (startPartition) {
                job.current_partition_time = utils.getTimeByPartition(job.frequency, startPartition)
            }
            jobUtil.saveJob(job).then(function () {
                res.redirect('/')
            }, function (err) {
                res.redirect('error?msg=' + err)
            })
        } else {
            res.redirect('error?msg=job already started')
        }
    }, function (err) {
        res.redirect('error?msg=' + err)
    })
})

app.get('/upendtime', function (req, res) {
    var jobName = req.query.job_name
    var endPartition = req.query.partition
    console.log('update end time of job: ', jobName, ' partition', endPartition)
    jobUtil.getJob(jobName).then(function (job) {
        if (endPartition && !utils.isPartitionLegal(job.frequency, endPartition)) {
            res.redirect('error?msg=partition is illegal')
            return
        }
        if (endPartition) {
            job.end_partition_time = utils.getTimeByPartition(job.frequency, endPartition)
        }
        jobUtil.saveJob(job).then(function () {
            res.redirect('/')
        }, function (err) {
            res.redirect('error?msg=' + err)
        })
    }, function (err) {
        res.redirect('error?msg=' + err)
    })
})
app.get('/stop', function (req, res) {
    var jobName = req.query.job_name
    jobUtil.getJob(jobName).then(function (job) {
        operation.killJob(jobName)
        job.status = 'stop'
        jobUtil.saveJob(job).then(function () {
            res.redirect('/')
        }, function () {
            res.redirect('error?msg=' + err)
        })
    }, function (err) {
        res.redirect('error?msg=' + err)
    })
})

app.get('/delete', function (req, res) {
    var jobName = req.query.job_name
    jobUtil.deleteJob(jobName).then(function () {
        res.redirect('/')
    }, function (err) {
        res.redirect('error?msg=' + err)
    })
})

app.get('/log', function (req, res) {
    var jobName = req.query.job_name
    fs.readFile(__dirname + '/../_jobs/' + jobName + '.log', function (err, data) {
        if (err) {
            res.redirect('error?msg=' + err)
            return
        }
        var logText = "" + data
        var tailLog = null
        if (logText.length > MAX_LOG_LENGTH) {
            // log too long cut text in middle
            tailLog = logText.substr(- MAX_LOG_LENGTH / 2, MAX_LOG_LENGTH / 2)
            logText = logText.substr(0, MAX_LOG_LENGTH / 2)
        }
        res.render('log', {
            title: 'Log',
            job_name: jobName,
            head: logText,
            tail: tailLog
        })
    })
})

app.get('/config', function (req, res) {
    var jobName = req.query.job_name
    fs.readFile(__dirname + '/../jobs/' + jobName + '.json', function (err, data) {
        if (err) {
            res.redirect('error?msg=' + err)
            return
        }
        var logText = "" + data
        var tailLog = null
        if (logText.length > MAX_LOG_LENGTH) {
            // log too long cut text in middle
            tailLog = logText.substr(- MAX_LOG_LENGTH / 2, MAX_LOG_LENGTH / 2)
            logText = logText.substr(0, MAX_LOG_LENGTH / 2)
        }
        res.render('log', {
            title: 'Config',
            job_name: jobName,
            head: logText,
            tail: tailLog
        })
    })
})

app.listen(config.port)

console.log('monitor start at port:', config.port)
