let express = require('express')
let app = express()
let cors = require('cors')
const server = require("http").Server(app);
const io = require("socket.io")(server);

app.use(express.json())
app.use(cors())

//  Milestone - 1

let servers = [
    {
        assigned: [],
        serverName: "Server_1",
        totalRemTime: 0,
        completed: []
    },
    {
        assigned: [],
        serverName: "Server_2",
        totalRemTime: 0,
        completed: []
    },
    {
        assigned: [],
        serverName: "Server_3",
        totalRemTime: 0,
        completed: []
    },
    {
        assigned: [],
        serverName: "Server_4",
        totalRemTime: 0,
        completed: []
    },
]

let currRequest = 0

setInterval(() => {
    for(let i=0; i<servers.length; i++){
        if(servers[i].assigned.length > 0){
            if(servers[i].assigned[0].completedTime < servers[i].assigned[0].reqTime){
                servers[i].assigned[0].completedTime += 1
                servers[i].totalRemTime -=1
                if(servers[i].assigned[0].completedTime == servers[i].assigned[0].reqTime){
                    servers[i].completed.push(servers[i].assigned.shift())
                }
            }
        }
    }
}, 1000)

app.get('/connect', (req, res) => {
    setTimeout(() => {
        res.send({"Connected": true})
    }, 1000)
})

let serverAssign = (req, res, next) => {
    let selected = 0
    let minRem = servers[0].totalRemTime
    for(let i=1; i< servers.length; i++){
        if (servers[i].totalRemTime < minRem){
            selected = i
            minRem = servers[i].totalRemTime
        }
    }
    req.selectedServer = selected
    servers[selected].assigned.push({
        reqTime: parseInt(req.body.TimeUnits), 
        completedTime: 0,
        reqNumber: currRequest + 1
    })
    currRequest += 1
    servers[selected].totalRemTime += parseInt(req.body.TimeUnits)
    next()
}

app.post('/assign', serverAssign, (req, res) => {
    let redirectString = `/server/:${servers[req.selectedServer].serverName}`
    res.redirect(redirectString)
})

app.get('/server/:serverName', (req, res) => {
    res.send({'assigned': req.params.serverName})
})

// Milestone - 2

let fifoQueue = []
let fifoComplete = []

let priorityQueue = []
let PQCompleted = []

let roundRobinQueue = []
let RRQCompleted = []

let queReqNumber = 0

setInterval(() => {
    if(fifoQueue.length == 0){
        return
    }
    fifoQueue[0].completedTime += 1
    if(fifoQueue[0].completedTime == fifoQueue[0].reqTime){
        fifoComplete.push(fifoQueue.shift())
    }
    priorityQueue[0].completedTime += 1
    if(priorityQueue[0].completedTime == priorityQueue[0].reqTime){
        PQCompleted.push(priorityQueue.shift())
    }
    roundRobinQueue[0].completedTime += 1
    let RRQShifted = false
    if(roundRobinQueue[0].completedTime == roundRobinQueue[0].reqTime){
        RRQCompleted.push(roundRobinQueue.shift())
        RRQShifted = true
    }
    if(!RRQShifted){
        let Temp = roundRobinQueue.shift()
        roundRobinQueue.push(Temp)
    }
}, 1000)

let newestRequest = 0

let queueAssign = (req, res, next) => {
    //Insert Request to FIFO Queue
    fifoQueue.push({
        reqTime: parseInt(req.body.TimeUnits), 
        completedTime: 0,
        reqNumber: queReqNumber + 1
    })
    //Insert Request into Priority Queue
    let pqContain = false
    for(let i=0; i< priorityQueue.length; i++){
        if(req.body.priority < priorityQueue[i].priority){
            priorityQueue.splice(i, 0, {
                reqTime: parseInt(req.body.TimeUnits), 
                completedTime: 0,
                reqNumber: queReqNumber + 1, 
                priority: req.body.priority
            })
            pqContain = true
            break
        }
    }
    if(!pqContain){
        priorityQueue.push({
            reqTime: parseInt(req.body.TimeUnits), 
            completedTime: 0,
            reqNumber: queReqNumber + 1, 
            priority: req.body.priority
        })
    }
    //Insert into Round Robin Queue
    roundRobinQueue.push({
        reqTime: parseInt(req.body.TimeUnits), 
        completedTime: 0,
        reqNumber: queReqNumber + 1
    })
    queReqNumber += 1
    req.requestNumber = queReqNumber
    next()
}

app.post('/assignToQueue', queueAssign, (req, res) => {
    newestRequest = req.requestNumber
    res.send({'reqNumber': req.requestNumber})
})

io.on("connection", (socket) => {
    setInterval(() => {
        io.to(socket.id).emit("servers", servers)
        io.to(socket.id).emit("queues", {
            'fifoQ': fifoQueue,
            'fifoComplete': fifoComplete,
            'priorityQ': priorityQueue,
            'PQCompleted': PQCompleted,
            'roundRobinQ': roundRobinQueue,
            'RRQCompleted': RRQCompleted,
            'newestReq': newestRequest
        })
    }, 1000)
})

server.listen(5000, () => {
    console.log("Server Listening on Port 5000")
})