#!/bin/bash
#
# Author: Tingzhao Yu
#

JOB_NAME=
JOB_COMMAND_LIST=
RETRY_INTERVAL=60

COMMAND_SEPARATOR=";"

function time_echo {
    echo `date "+[%Y-%m-%d %H:%M:%S] "`"$@"
}

function RunCommandUntilSuccess() {
    if [ $# -lt 1 ] || [ $# -gt 3 ]; then
        echo "Usage: RunCommandUntilSuccess command failure_retry_interval_secs error_msg"
        return 1
    fi

    local _CMD=$1

    local _ERROR_MSG=
    if [ $# -ge 3 ]; then
        _ERROR_MSG=$3
    fi

    while :
    do
        eval $_CMD

        if [ $? -eq 0 ]; then
            break
        else
            if [ $_ERROR_MSG ]; then
                echo "$_ERROR_MSG"
            fi

            echo `date +%Y-%m-%d-%T`" Failed to run command: '$_CMD'. Retry in $RETRY_INTERVAL seconds."
            sleep $RETRY_INTERVAL
        fi
    done
}

function ExecuteJob() {

    local _DEPENDENT_JOB_WAIT_INTERVAL=600
    local _START_TIME=`date +%s`

    time_echo "==== Start building $JOB_NAME of $PARTITION ===="
    time_echo "{{JOB_NAME::$JOB_NAME}}"
    time_echo "{{PID::$$}}"
    time_echo "{{PARTITION::$PARTITION}}"
    time_echo "{{JOB::START}}"

    # Start run all command
    local _OLD_IFS=$IFS
    local _INDEX="0"
    IFS=$COMMAND_SEPARATOR
    for i in $JOB_COMMAND_LIST
    do
        local _CMD="$i"
        local _RETRY_FLAG="${JOB_COMMAND_LIST_RETRY_FLAG[$_INDEX]}"
        _INDEX=`expr $_INDEX + 1`
        if [ "$_RETRY_FLAG" = "true" ]; then
            RunCommandUntilSuccess $_CMD
        else
            eval $_CMD
        fi
        return_code=$?
        if [ $return_code -eq 0 ]; then
            time_echo "Success to run command: '$_CMD'."
        elif [ $return_code -eq 9 ]; then
            time_echo "Job will be skipped because of command $_CMD return code is 9."
            break
        else
            time_echo "{{FAILED_TASK::$_CMD}}"
            time_echo "Failed to run command: '$_CMD'."
            time_echo "{{JOB::FAILED}}"
            exit 1
        fi
    done
    local _END_TIME=`date +%s`
    _PROCESSING_TIME=`expr $_END_TIME - $_START_TIME`
    time_echo "{{PROCESSING_TIME::$_PROCESSING_TIME}}"
    time_echo "{{JOB::SUCCESS}}"
    IFS=$_OLD_IFS

}
