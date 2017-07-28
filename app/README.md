
Past performance data related:
##########
- dump_redis.sh
dump all the up-to-date performance data from redis
output: performances.json

Example:
{
    performance:xxxxx:{
        "type":
        "value":{
            {"name": "vStart","data": "xxx"}
            ...
        }
    }
    ...
}

- performances.json
After being created from dump_redis.sh, following info needs to be added in each performance including:

"performer"
"location"
"title"

Example:
{
"performance:xxx": {
        "type": "list",
        "performer": "Sarah",
        "location": "Earth",
        "time": "xxxx",
        "title": "Nov 22nd",
        "value": [
             {"name": "vStart","data": "xxx"}
            ...
        ]
    },
    ...
}


Narrative spreadsheet
##########
location: /visualcontent/narrativeXXX.csv
input format: [from stage]/[to stage]/[narratives] p.s. should be a string in one cell

