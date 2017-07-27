#!/bin/sh
# export data from redis
redis-dump -f 'performance:*' --json > performances.json


