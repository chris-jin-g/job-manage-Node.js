# This is a shell command file to kill a job.
# Usage: sh kill.sh JOB_NAME

cd _jobs
# $1 is the job name
_JOB_NAME=$1
PID=`ps aux | grep $_JOB_NAME.sh | grep -v grep | awk '{print $2}'`
if [[ "$PID" != "" ]]; then
    kill -9 $PID||true
    echo "killed $PID"
fi