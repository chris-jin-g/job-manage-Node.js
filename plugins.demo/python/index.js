//
// A base plugin for demo
// taskConfig: {
//  "file": "your python file"
// }

module.exports = function (jobName, jobConfig, taskConfig) {
    return 'python ' + taskConfig.file
}