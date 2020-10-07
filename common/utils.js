var fs = require('fs')
var moment = require('moment')
var when = require('when')

exports.getAllJobsConfig = function () {
    var promise = when.promise(function (resolve, reject, notify) {
        var jobs = []
        var CONFIG_DIR = __dirname + '/../jobs'
        fs.readdir(CONFIG_DIR, function (err, files) {
            if (err) {
                reject(err)
                return
            } else {
                for (var i = 0; i < files.length; i ++) {
                    var fileName = files[i]
                    if (!/\.json$/.test(fileName)) {
                        continue
                    }
                    var jobName = fileName.replace(/\.json$/, '')
                    jobs.push({
                        jobName: jobName,
                        config: require(CONFIG_DIR + '/' + fileName)
                    })
                }
            }
            resolve(jobs)
        })
    })
    return promise
}

exports.isPartitionLegal = function (frequency, partition) {
    switch(frequency) {
        case 'monthly':
            return /^\d\d\d\d\/\d\d\/\d\d$/.test(partition)
        case 'weekly':
            return /^\d\d\d\d\/\d\d\/\d\d$/.test(partition)
        case 'daily':
            return /^\d\d\d\d\/\d\d\/\d\d$/.test(partition)
        case 'hourly':
            return /^\d\d\d\d\/\d\d\/\d\d\/\d\d$/.test(partition)
        case 'quarterly':
            return /^\d\d\d\d\/\d\d\/\d\d\/\d\d\/\d$/.test(partition)
    }
    return false
}

exports.getTimeByPartition = function (frequency, partition) {
    var time = null
    switch(frequency) {
        case 'monthly':
            time = moment(partition, 'YYYY/MM/DD').endOf('month').toDate()
            break
        case 'weekly':
            time = moment(partition, 'YYYY/MM/DD').endOf('week').toDate()
            break
        case 'daily':
            time = moment(partition, 'YYYY/MM/DD').toDate()
            break
        case 'hourly':
            time = moment(partition, 'YYYY/MM/DD/HH').toDate()
            break
        case 'quarterly':
            var p = partition.split('/')
            p[p.length - 1] = parseInt(p[p.length - 1]) * 15
            time = moment(p.join('/'), 'YYYY/MM/DD/HH/mm').toDate()
            break
        default:
            time = new Date()
    }
    return getPartitionTimeByTime(frequency, time)
}

var getPartitionByTime = function (frequency, time) {
    if (!time) {
        return 'N/A'
    }
    switch(frequency) {
        case 'monthly':
            return moment(time).endOf('month').format('YYYY/MM/DD')
        case 'weekly':
            return moment(time).endOf('week').format('YYYY/MM/DD')
        case 'daily':
            return moment(time).format('YYYY/MM/DD')
        case 'hourly':
            return moment(time).format('YYYY/MM/DD/HH')
        case 'quarterly':
            return moment(time).format('YYYY/MM/DD/HH') + '/' + Math.floor(time.getMinutes() / 15)
    }
}

exports.getPartitionByTime = getPartitionByTime

var getPartitionTimeByTime = function (frequency, time) {
    if (!time) {
        return 'N/A'
    }
    var partitionTime = moment(time)
    switch(frequency) {
        case 'monthly':
            partitionTime.endOf('month')
            break
        case 'weekly':
            partitionTime.endOf('week')
            break
        case 'daily':
            partitionTime.endOf('day')
            break
        case 'hourly':
            partitionTime.endOf('hour')
            break
        case 'quarterly':
            partitionTime.minutes(Math.ceil(partitionTime.minutes() / 15) * 15)
            break
    }
    partitionTime.second(0)
    partitionTime.milliseconds(0)
    return partitionTime
}

exports.getPartitionTimeByTime = getPartitionTimeByTime

exports.getNextPartitionTimeByTime = function (frequency, time) {
    var nextPatitionTime = moment(getPartitionTimeByTime(frequency, time))
    switch(frequency) {
        case 'monthly':
            nextPatitionTime.add(1, 'months')
            break
        case 'weekly':
            nextPatitionTime.add(1, 'weeks')
            break
        case 'daily':
            nextPatitionTime.add(1, 'days')
            break
        case 'hourly':
            nextPatitionTime.add(1, 'hours')
            break
        case 'quarterly':
            nextPatitionTime.add(15, 'minutes')
            break
    }
    return nextPatitionTime.toDate()
}

//
// duration is s
//
exports.humanDuration = function (duration) {
    return moment.duration(duration, 'seconds').humanize()
}
