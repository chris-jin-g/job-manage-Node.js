
var spawn = require('child_process').spawn
var utils = require('../common/utils')
var moment = require('moment')

exports.init = function () {

}

exports.startJob = function (job, partitionTime) {
    var partition = utils.getPartitionByTime(job.frequency, partitionTime)
    console.log('start new partition of job ', job.name, ' partition: ', partition)
    var sh = spawn('sh', [__dirname + '/start.sh',
        job.name,
        partition,
        moment(partitionTime).format('YYYY-MM-DD'),
        partitionTime.getFullYear(),
        partitionTime.getMonth(),
        partitionTime.getDate(),
        partitionTime.getHours(),
        Math.floor(partitionTime.getMinutes() / 15)])

    sh.stdout.on('data', function (data) {
        // console.log(data)
    })

    sh.stderr.on('data', function (data) {
        console.error('start job error: ' + data);
    })

    sh.on('close', function (code) {
        if (code !== 0) {
            console.log('started job with code ' + code);
        }
    })
}

exports.killJob = function (jobName) {
    var sh = spawn('sh', [__dirname + '/kill.sh', jobName])
    sh.stdout.on('data', function (data) {
        //console.log(data)
    })

    sh.stderr.on('data', function (data) {
        console.error('kill job error: ' + data);
    })

    sh.on('close', function (code) {
        if (code !== 0) {
            console.log('kill job with code ' + code);
        }
    })
}
