# This is a shell to build job json config to job shell.
# Usage: sh build.sh, then will puts output to forder _jobs.

mkdir -p _jobs/src
mkdir -p _jobs/resources
mkdir -p _jobs/backup_logs
cp -r jobs/src _jobs/
cp -r builder/resources _jobs/
node builder/index.js
echo "build jobs config done. jobs shell output to forder _jobs"