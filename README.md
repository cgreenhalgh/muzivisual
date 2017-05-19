#. Muzicodes git : https://github.com/cgreenhalgh/musiccodes.

Prerequisites: 
#. Install VirtualBox, Vagrant and Chrome.

#. run Muzicodes
On Mac OS X double-click/run `musiccodes.command`. 

Note: if you get a security warning (and you still wish to run it) then open `System Preferences`, `Security and Privacy`, and next to the comment `"musiccodes.command" was blocked from opening...` click `Open Anyway`.

On Windows double-click/run `musiccodes.bat`

enter bootstrap folder of Muzicodes
vagrant up
vagrant ssh
cd /vagrant

# in vagrant get MuziVisual, git: https://github.com/littlebugivy/muzivisual
# run: node muzivisual/app/server.js

========Port=========
Need to be in the same machine
Muzicodes : localhost:3000
MuziVisual: localhost:8000


# MuziVisual
Framework: Node.js + Express.js + Angualr.js + socket.io

#socket.io - communication
Roomname: visualRoom
Muzicodes: on : vStageChange - notify the stage change
				vStart - notify the performance starts
				vTimer - synchronized timer
		   emit: vStart - performance start
		    	  vStageChange - notify stage change

Visual:    emit:vTimer