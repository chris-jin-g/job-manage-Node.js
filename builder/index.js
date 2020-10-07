
//
// This is the builder to compile job config json to folder .builder
//

console.log('start run builder ...')

var fs = require('fs')
var utils = require('../common/utils')

var JOB_TEMPLATE = '' + fs.readFileSync(__dirname + '/resources/job_template.tmpl')
if (!JOB_TEMPLATE) {
    console.error('read template error')
    return
}

var getRetryInterval = function (frequency) {
    if (frequency == 'quarterly') {
        return 60
    }
    if (frequency == 'hourly') {
        return 300
    }
    if (frequency == 'daily') {
        return 600
    }
    return 3600
}

var buildJob = function (jobName, config) {
    console.log('start build job : ', jobName, ' with config ', JSON.stringify(config))
    var tasks = config.tasks
    var jobCommandList = [], task, command
    var jobCommandListRetryFlag = []
    for (var i = 0; i < tasks.length; i ++) {
        task = tasks[i]
        command = require('../plugins/' + task.plugin)(jobName, config, task.config)
        console.log(command)
        if (command) {
            jobCommandList.push(command)
            task.retry = task.retry || 'false'
            jobCommandListRetryFlag.push('"' + task.retry + '"')
        }
    }
    var jobShell = JOB_TEMPLATE
        .replace('{prod_root}', __dirname.replace(/builder$/, '_jobs'))
        .replace('{job_name}', jobName)
        .replace('{frequency}', config.frequency.toUpperCase())
        .replace('{job_command_list}', jobCommandList.join(';').replace(/\"/g, '\\\"'))
        .replace('{job_command_list_retry_flag}', '(' + jobCommandListRetryFlag.join(' ') + ')')
        .replace('{retry_interval}', getRetryInterval(config.frequency))
    fs.writeFile(__dirname + '/../_jobs/' + jobName + '.sh', jobShell, function (err) {
        if (err) {
            console.error('write job ', jobName, ' failed. ', err)
        }
    })
}

utils.getAllJobsConfig().then(function (jobs) {
    for (var i = 0; i < jobs.length; i ++) {
        buildJob(jobs[i].jobName, jobs[i].config)
    }
}, function (err) {
    console.log(err)
})
