# Muzivisual Logtools

Tools to process muzivisual server-side logs.

## Build 

```
docker build -t mvlogtools .
```

```
docker run -it --rm --name mvlogtools mvlogtools
```
```
docker cp src/. mvlogtools:/root/work/src/
docker cp data/. mvlogtools:/root/work/data/

docker cp mvlogtools:/root/work/out.json public/out.json

```

```
node dist/log2views.js data/muzivisual-20171219T115909802Z.log \
 2018-01-19T17:50:00.000Z 2018-01-19T19:10:00.000Z out.json data/markers.json
```

```
cp public/* /vagrant/html/1/logs/
```



## Plan

Time left to right.

Lanes (horizontal) for each user/app. Labelled by user ID.

Screen visible - y offset and colour coded. Tool tip? Vertical bar at start, vertical link to last screen if continuous. Horizontal line for duration visible.

### output

JSON file with:
- `users`, array of users
- `views`, array of views
- `pages`, array of pages

User, JSON object with:
- `userid`, string U...

View, JSON object with:
- `datetime`
- `userix`, index of user
- `startOffset`, seconds
- `duration`, seconds
- `navigation`, boolean, explicit navigation event?
- `pageix`, index of page viewed

Page (viewed), JSON object with:
- `page`, string, ID

number 0-1, vertical lane offset of page display


### Config

- min time
- max time / duration
- log file

Note, AYB (times from Climb laptop)

- meld load at 2018-01-19T18:05:11.680Z
- first note at 2018-01-19T18:05:21.168
- last note 2018-01-19T18:23:10.876Z
- stop 2018-01-19T18:27:15.568Z
- second performance meld load 2018-01-19T18:31:51.547Z
- first note 2018-01-19T18:32:41.013Z
- last note 2018-01-19T18:51:10.359Z
- stop 2018-01-19T18:51:30.430Z

## Log parsing

### Problems

At least until 07/03/2018 the log files are incomplete. Specifically the performance parameter is missing, as is the i parameter for the current performance(s), i.e. we can't distinguish if they view the second performance before it starts.

We will 
- assume (hope) that people are only viewing the app for the current performance(s)
- assume that subsequent views of /performance are switching between current/future performance(s)
- have to guess when the second app is loaded
