// log2views.ts
// Convert muzivisual log file to data on users and page views suitable for timeline visualisation.

import * as fs from 'fs' 

if (process.argv.length != 6 && process.argv.length != 7) {
  console.log("usage: node dist/log2views.js <muzivisual-logfile.json> <start-datetime> <end-datetime> <outfile> [<markerfile.json>]")
  process.exit(-1)
}

let logfilename = process.argv[2]
let fromdatetime = process.argv[3]
let fromtime = new Date(fromdatetime).getTime()
let todatetime = process.argv[4]
let totime = new Date(todatetime).getTime()
console.log(`time range ${fromtime} - ${totime} (${totime-fromtime} ms)`)
let outfilename = process.argv[5]
let logfile = fs.readFileSync(logfilename, 'utf-8')
let lines = logfile.split('\n')

// log input
class LogInfo {
  //log.start
  logversion?:string
  application?:string
  installId?:string
  //http.listen
  port?:number
  //loguse.client.add
  clientid?:string
  userid?:string
  //loguse.client.visible
  //clientid, userid
  clienttime?:number
  //loguse.client.view
  //userid,clientid
  path?:string
  info?:any
  //loguse.client.hidden
  //userid,clientid,clienttime
  after?:number
  //loguse.client.log
  event?:string
  message?:string
  vibrate?:boolean
  duration?:number
}
class LogEntry {
  time:number
  datetime:string
  component:string
  event:string
  info:LogInfo
}

// output classes
class User {
  userid:string
  ix:number
  constructor(userid:string, ix:number) { this.userid = userid; this.ix = ix; }
}
class Page {
  page:string
  ix:number
  constructor(page:string, ix:number) { this.page = page; this.ix = ix; }
}
class View {
  //datetime:string
  time:number
  userix:number
  startOffset:number // seconds
  duration:number // seconds
  navigation:boolean // explicit navigation event?
  pageix:number // index of page viewed
  lastPageix?:number
}
class Marker {
  time:number
  datetime:string
  label:string
}
class Metadata {
  fromtime:number
  fromdatetime:string
  totime:number
  todatetime:string
  logfilename:string
  markers:Marker[]
}
class Views {
  metadata:Metadata = new Metadata()
  views:View[] = []
  pages:Page[] = []
  users:User[] = []
  getPage(page:string):number {
    let p = this.pages.find(p => p.page == page)
    if (!p) {
      console.log(` add page ${page} as ${this.pages.length}`)
      p = new Page(page, this.pages.length)
      this.pages.push(p)
    }
    return p.ix
  }
  getUser(userid:string):number {
    let u = this.users.find(p => p.userid == userid)
    if (!u) {
      console.log(` add user ${userid} as ${this.users.length}`)
      u = new User(userid,this.users.length)
      this.users.push(u)
    }
    return u.ix
  }
}
let views = new Views()
views.metadata.fromtime = fromtime
views.metadata.totime = totime;
views.metadata.todatetime = todatetime;
views.metadata.fromdatetime = fromdatetime;
views.metadata.logfilename = logfilename;
views.metadata.markers = []

if (process.argv.length>6) {
  let markerfilename = process.argv[6]
  console.log(`read markers from ${markerfilename}`)
  let markerfile = fs.readFileSync(markerfilename, 'utf-8')
  let markers = JSON.parse(markerfile)
  for (let marker of markers) {
    if (!marker.time)
      marker.time = new Date(marker.datetime).getTime()
    if (marker.time >= fromtime && marker.time <=totime)
      views.metadata.markers.push(marker)
    else
      console.log(`ignore marker ${JSON.stringify(marker)}`)
  }
}

let PAGES = [
  '/',
  '/content/Programme Note',
  '/content/Performers',
  '/content/map',
  '/content/What can see and hear',
  '/content/How it works',
  '/content/Archive',
  '/content/Research',
  '/performance/',
  '/performance/past?i=1',
  '/performance/past?i=2',
  '/performance/past?i=3',
  '/performance/past?i=4'
]

for (let page of PAGES)
  views.getPage(page)

// client state-tracking
class PageTotal {
  page:string
  visits:number = 0
  duration:number = 0
}
class Client {
  userid:string
  clientid:string
  visible:boolean
  lastVisibleChangeTime:number
  lastPage:string
  lastPageTime:number
  lastPageNavigation:boolean
  lastLastPage:string
  pageTotals:PageTotal[]
  intime:boolean = false
  outoftime:boolean = false
  clientTimeOffset:number
  clientTimeOffsetTime:number
}
let clients:Client[] = []

function getClient(entry:LogEntry) : Client {
  let client = clients.find(c => c.userid == entry.info.userid)
  if (client===null || client===undefined) {
    console.log(`adding client ${entry.info.userid}`)
    client = new Client()
    client.userid = entry.info.userid
    client.clientid = entry.info.clientid
    client.pageTotals = []
    client.clientTimeOffset = 0
    client.clientTimeOffsetTime = 0
    clients.push(client)
  }
  // in general we expect some client messages to be delayed, i.e. client time may be earlier than received time
  // but of course it can't have been sentin the future
  if (entry.info.clienttime && (entry.info.clienttime + client.clientTimeOffset > entry.time || entry.info.clienttime - client.clientTimeOffsetTime > 24*60*60*1000 )) {
    client.clientTimeOffsetTime = entry.info.clienttime
    client.clientTimeOffset = entry.time - entry.info.clienttime
    console.log(`client ${client.userid} time offset = ${client.clientTimeOffset} at ${entry.datetime}`)
  }
  return client
}

function addView(client:Client, time:number) {
  let page = views.getPage(client.lastPage)
  let view = new View()
  view.time = client.lastPageTime
  view.startOffset = client.lastPageTime - fromtime
  view.duration = time - client.lastPageTime
  view.pageix = page
  view.navigation = client.lastPageNavigation
  if (view.navigation && client.lastLastPage) {
    view.lastPageix = views.getPage(client.lastLastPage)
  } else {
    view.lastPageix = view.pageix;
  }
  view.userix = views.getUser(client.userid)
  views.views.push(view)
  let pt = client.pageTotals[view.pageix]
  if (!pt) {
      pt = new PageTotal()
      pt.page = client.lastPage
      client.pageTotals[view.pageix] = pt
  }
  pt.visits = pt.visits+1
  pt.duration  = pt.duration+0.001*view.duration
}

for (let l in lines) {
  let line = lines[l].trim()
  if (line.length==0)
    continue
  try {
    let entry:LogEntry = JSON.parse(line) as LogEntry
    
    if ('loguse.client.add'==entry.event) {
      let client = getClient(entry)
    }
    else if (entry.info.userid!==null) {
      let client = getClient(entry)
      if (entry.info.clienttime)
        entry.time = entry.info.clienttime + client.clientTimeOffset
      
      if (!client.intime && entry.time >= fromtime) {
        client.intime = true
        //console.log(`reached start time`)
        // clip off prior state
        client.lastPageNavigation = false
        client.lastPageTime = fromtime
        client.lastVisibleChangeTime = fromtime
      }
      if (!client.outoftime && entry.time > totime) {
        if (client.lastPage && client.visible) {
          addView(client, totime)
        }
        client.outoftime = true
      }
      if (client.outoftime) {
        continue
      }
      if ('loguse.client.view'==entry.event) {
      
        if (client.intime && client.lastPage && client.visible) {
          addView(client, entry.time)
        }
        client.lastLastPage = client.lastPage
        client.lastPage = entry.info.path
        client.lastPageTime = entry.time
        client.lastPageNavigation = true
        //let page = views.getPage(client.lastPage)
      }
      else if ('loguse.client.visible'==entry.event) {
        if (client.intime && client.lastPage) {
          client.lastPageNavigation = false
          client.lastPageTime = entry.time
        }
        client.visible = true
        client.lastVisibleChangeTime = entry.time
      } 
      else if ('loguse.client.hidden'==entry.event) {
        if (client.intime && client.lastPage && client.visible) {
          addView(client, entry.time)
        }
        client.visible = false
        client.lastVisibleChangeTime = entry.time
      }
    } 
  } catch (err) {
    console.log(`Error processing log line ${l}: ${err.message}: ${line}`, err)
  }
}
console.log(`read ${lines.length} lines`)

let text = JSON.stringify(views, null, 4)
fs.writeFileSync(outfilename, text, 'utf-8')
console.log(`written to ${outfilename}`)

let totalsfilename = 'pagetotals.csv'
console.log(`write page totals to ${totalsfilename}`)
let totals = 'user'
for (let page of views.pages) {
  totals += ','+page.page+'-v,'+page.page+'-s'
}
totals += '\n'

for (let user of views.users) {
  let client = clients.find(c => c.userid == user.userid)
  totals += 'U'+user.userid
  for (let page of views.pages) {
    totals += ','
    if(client.pageTotals[page.ix]) {
      totals += client.pageTotals[page.ix].visits+','+client.pageTotals[page.ix].duration
    } else {
      totals += ','
    }
  }
  totals += '\n'
}

fs.writeFileSync(totalsfilename, totals)
