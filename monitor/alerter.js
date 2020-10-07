//
// This is a module to send alert when job delay, dead and failed
//

var when = require('when')
var utils = require('../common/utils')
var config = require('../config.json')
var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport')
var ejs = require('ejs')
var fs = require('fs')

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
var MAIL_TEMPLATE = 'waiting for read mail template : alert.html'
fs.readFile(__dirname + '/template/alert.html', function (err, file) {
    if (err) {
        console.error(err)
        return
    }
    MAIL_TEMPLATE = '' + file
})

//
// each item in jobs is:
// {
//     job: {},
//     delayDuration: 3232 // s
// }

var sendMail = function (delayJobs, errorJobs) {
    console.log('send alert mail ...')
    if (!config.email) {
        console.error('not find email config in config.json')
        return
    }
    // create reusable transporter object using SMTP transport
    var transporter = nodemailer.createTransport(smtpTransport({
        host: config.email.host,
        auth: config.email.auth
    }))

    // NB! No need to recreate the transporter object. You can use
    // the same transporter object for all e-mails

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: config.email.from, // sender address
        to: config.email.to,
        subject: 'Job Manager Alert', // Subject line
        text: 'Errors occured!~', // plaintext body
        html: ejs.render(MAIL_TEMPLATE, {
            delayJobs: delayJobs,
            errorJobs: errorJobs,
            partition: utils.getPartitionByTime,
            formatTime: function (t) {
                return moment(t).format('YYYY-MM-DD HH:mm:ss')
            },
            formatDuration: utils.humanDuration
        })
    }

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.error('Sent mail error :')
            console.log(error)
        }else{
            console.log('Message sent: ' + info.response)
        }
    })
}

// value (s)
var alertThreshold = {
    'quarterly': 3600, // 1 hour
    'monthly': 36000, // 10 hours
    'daily': 18000, // 5 hours
    'weekly': 28800, // 8 hours
    'hourly': 10800 // 3 hours
}

exports.checkAndAlertJobs = function (jobs) {
    console.log('check and alert jobs')
    var promise = when.promise(function (resolve, reject, notify) {
        var delayJobs = []
        var errorJobs = []
        var job = null, delayDuration = 0, nowPartitionTime = null, currentPartitionTime = null
        for (var i = 0; i < jobs.length; i ++) {
            job = jobs[i]
            if (job.status == 'success' || job.status == 'stop') {
                continue
            }
            if (job.status == 'dead' || job.status == 'failed' || job.status == 'error') {
                errorJobs.push({
                    job: job
                })
            } else {
                currentPartitionTime = job.current_partition_time
                if (currentPartitionTime.getTime() > Date.now()) {
                    // still wating time
                    continue
                }
                delayDuration = Math.ceil((Date.now() - currentPartitionTime.getTime()) / 1000)
                if (delayDuration >= (alertThreshold[job.frequency] || 18000)) {
                    delayJobs.push({
                        job: job,
                        delayDuration: delayDuration
                    })
                }
            }
        }
        if (delayJobs.length > 0 || errorJobs.length > 0) {
            sendMail(delayJobs, errorJobs)
        }
        // TODO shen mail promise
        resolve()
    })
    return promise
}
