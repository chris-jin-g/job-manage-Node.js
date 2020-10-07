//
// A base plugin for demo
// taskConfig: {
//  "command": "your shell command here"
// }

module.exports = function (jobName, jobConfig, taskConfig) {
    return taskConfig.command
}