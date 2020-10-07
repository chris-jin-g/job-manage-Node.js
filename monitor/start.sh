# This is a shell command file to start a jobs.
# Usage: sh start.sh JOB_NAME ....[PARAMS]

cd _jobs

_JOB_NAME=$1 # demo.a
_PARTITION=$2 # 2014/10/15/20/0
_DATE=$3 # 2014-10-15
_YEAR=$4
_MONTH=$5
_SHORT_DATE=$6
_HOUR=$7
_QUARTER=$8

PID=`ps aux | grep $_JOB_NAME.sh | grep -v grep | awk '{print $2}'`
if [[ "$PID" != "" ]]; then
    echo "job $_JOB_NAME already start"
    exit 1
fi


if [ -f $_JOB_NAME.log ]; then
    # move old log for backup
    if ! [ -d backup_logs/$_JOB_NAME ]; then
        mkdir -p backup_logs/$_JOB_NAME
    fi
    cp "$_JOB_NAME.log" "backup_logs/$_JOB_NAME/LOG_`date "+%Y-%m-%d %H:%M:%S"`.log"
fi
nohup sh $_JOB_NAME.sh $_PARTITION $_DATE $_YEAR $_MONTH $_SHORT_DATE $_HOUR $_QUARTER > $_JOB_NAME.log 2>&1 &