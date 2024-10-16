'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Database, Link, Zap, Play, Pause, RotateCcw, Battery, Thermometer, Info, Eye, EyeOff, Upload } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Canvas, useFrame, extend, Vector3 } from '@react-three/fiber'
import { OrbitControls, Sphere, Text, Line as ThreeLine } from '@react-three/drei'
import * as THREE from 'three'
import { ethers } from 'ethers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import RandomTopologyGenerator from './random_topology_generator'

extend(THREE)

declare global {
  interface Window {
    ethereum: any; // or a more specific type if known
  }
}

// Simulated WebSocket connection
const socket = new WebSocket('wss://example.com/ws')

// Smart Contract ABI (example)
const contractABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }],
    "name": "deployAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

interface GridProps {
  size: number;
  agents: any[]; // Replace 'any' with the correct type for agents
  obstacles: any[]; // Replace 'any' with the correct type for obstacles
  visitedCells: any[]; // Replace 'any' with the correct type for visitedCells
  connectionRadius: number;
  isRotating: boolean;
}

// 3D Grid component
const Grid = ({ size, agents, obstacles, visitedCells, connectionRadius, isRotating }: GridProps) => {
  const gridRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (gridRef.current && isRotating) {
      (gridRef.current as THREE.Object3D).rotation.y += 0.005
    }
  })

  const baseStationPosition = [-size / 2, 0.5, -size / 2]

  return (
    <group ref={gridRef}>
      {/* Grid cells */}
      {[...Array(size)].map((_, x) =>
        [...Array(size)].map((_, z) => (
          <Sphere
            key={`${x}-${z}`}
            position={[x - size / 2, 0, z - size / 2]}
            args={[0.45, 16, 16]}
          >
            <meshStandardMaterial 
              color={obstacles.some(o => o.x === x && o.z === z) ? 'red' : 
                     visitedCells.some(v => v.x === x && v.y === z) ? 'yellow' : 'gray'} 
              transparent
              opacity={0.7}
            />
          </Sphere>
        ))
      )}

      {/* Base Station */}
      <Sphere position={baseStationPosition as [number, number, number]} args={[0.5, 32, 32]}>
        <meshStandardMaterial color="green" />
      </Sphere>
      <Text position={[baseStationPosition[0], baseStationPosition[1] + 0.7, baseStationPosition[2]]} fontSize={0.5} color="white">
        Base Station
      </Text>

      {/* Agents */}
      {agents.map((agent, index) => (
        <group key={index} position={[agent.x - size / 2, 0.5, agent.y - size / 2]}>
          <Sphere args={[0.4, 32, 32]}>
            <meshStandardMaterial color="blue" />
          </Sphere>
          <Text
            position={[0, 0.7, 0]}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontSize={0.3}
          >
            {agent.id}
          </Text>

          {/* Connection to Base Station */}
          <ThreeLine
            points={[[0, 0, 0], [baseStationPosition[0] - (agent.x - size / 2), 0, baseStationPosition[2] - (agent.y - size / 2)]]}
            color="green"
            lineWidth={1}
          />

          {/* Connections to other agents within range */}
          {agents.map((otherAgent, otherIndex) => {
            if (index !== otherIndex) {
              const distance = Math.sqrt(Math.pow(agent.x - otherAgent.x, 2) + Math.pow(agent.y - otherAgent.y, 2))
              if (distance <= connectionRadius) {
                return (
                  <ThreeLine
                    key={`connection-${index}-${otherIndex}`}
                    points={[[0, 0, 0], [otherAgent.x - agent.x, 0, otherAgent.y - agent.y]]}
                    color="cyan"
                    lineWidth={1}
                  />
                )
              }
            }
            return null
          })}
        </group>
      ))}

      {/* Connection range indicator */}
      {agents.map((agent, index) => (
        <Sphere
          key={`range-${index}`}
          position={[agent.x - size / 2, 0.5, agent.y - size / 2]}
          args={[connectionRadius, 32, 32]}
        >
          <meshBasicMaterial color="cyan" transparent opacity={0.1} />
        </Sphere>
      ))}
    </group>
  )
}

// 3D Information Transfer Graph component
const InformationTransferGraph: React.FC<{ agents: any[]; onNodeClick: (node: any) => void }> = ({ agents, onNodeClick }) => {
  const graphRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (graphRef.current) {
      graphRef.current.rotation.y += 0.005
    }
  })

  const nodePositions = useMemo(() => {
    if (agents.length === 0) return []
    return agents.map((_, index) => {
      const theta = (index / agents.length) * Math.PI * 2
      const radius = 5
      return new THREE.Vector3(
        Math.cos(theta) * radius,
        Math.random() * 2 - 1,
        Math.sin(theta) * radius
      )
    })
  }, [agents])

  return (
    <group ref={graphRef}>
      {agents.map((agent, index) => (
        <group key={index} position={nodePositions[index]}>
          <Sphere args={[0.3, 32, 32]} onClick={() => onNodeClick(agent.id)}>
            <meshStandardMaterial color="blue" />
          </Sphere>
          <Text
            position={[0, 0.5, 0]}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontSize={0.3}
          >
            {agent.id}
          </Text>
        </group>
      ))}
      {agents.map((_, i) =>
        agents.slice(i + 1).map((_, j) => {
          if (Math.random() > 0.5 && i + j + 1 < nodePositions.length) {
            return (
              <ThreeLine
                key={`edge-${i}-${j}`}
                points={[nodePositions[i], nodePositions[i + j + 1]]}
                color="cyan"
                lineWidth={1}
              />
            )
          }
          return null
        })
      )}
    </group>
  )
}

type Agent = {
    id: number;
    x: number;
    y: number;
    battery: number;
    temperature: number;
};

// Define the type for the blockchain data
type BlockchainData = {
    time: string;
    blockHeight: number;
    gasPrice: number;
};

export function DashboardComponent() {
  const [gridSize, setGridSize] = useState(10)
  const [agentCount, setAgentCount] = useState(3)
  const [collisionAvoidance, setCollisionAvoidance] = useState(true)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [grid, setGrid] = useState<{ hasObstacle: boolean; hasAgent: boolean; }[][]>([]); // Define the type for grid
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dataPoints, setDataPoints] = useState<{ [key: number]: number }>({});
  const [blockchainData, setBlockchainData] = useState<BlockchainData[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null) // Specify the type here
  const [visitedCells, setVisitedCells] = useState<{ x: number; y: number }[]>([]); // Define the type for visitedCells
  const [connectionRadius, setConnectionRadius] = useState(3)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isRotating, setIsRotating] = useState(true)
  const [cameraPosition, setCameraPosition] = useState([20, 20, 20])
  const [dronePaths, setDronePaths] = useState<number[][]>([]); // Define the type of dronePaths
  const [currentPathIndex, setCurrentPathIndex] = useState(0)
  const [pathInput, setPathInput] = useState('')

  useEffect(() => {
    initializeGrid()
    initializeAgents()
    initializeBlockchain()

    // WebSocket event listeners
    socket.addEventListener('open', () => console.log('WebSocket connected'))
    socket.addEventListener('message', handleWebSocketMessage)

    return () => {
      socket.close()
    }
  }, [gridSize, agentCount])

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined; // Explicitly typing the interval variable
    if (isSimulationRunning && dronePaths.length > 0) {
      interval = setInterval(() => {
        moveAgentsAlongPath()
        collectData()
        updateBlockchainData()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSimulationRunning, agents, dronePaths, currentPathIndex])

  const initializeGrid = () => {
    const newGrid = []
    for (let i = 0; i < gridSize; i++) {
      const row = []
      for (let j = 0; j < gridSize; j++) {
        row.push({ hasObstacle: Math.random() > 0.8, hasAgent: false })
      }
      newGrid.push(row)
    }
    setGrid(newGrid as { hasObstacle: boolean; hasAgent: boolean; }[][]); // Ensure newGrid matches the type
  }

  const initializeAgents = () => {
    const newAgents = []
    for (let i = 0; i < agentCount; i++) {
      let x, y
      do {
        x = 0
        y = 0
      } while (grid[y] && grid[y][x] && (grid[y][x].hasObstacle || grid[y][x].hasAgent))
      
      newAgents.push({
        id: i + 1,
        x,
        y,
        battery: 100,
        temperature: 25,
      })
      setDataPoints(prev => ({ ...prev, [i + 1]: 0 }))
    }
    setAgents(newAgents as Agent[]) // Cast newAgents to the correct type
    updateGridWithAgents(newAgents)
  }

  const initializeBlockchain = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)

      try {
        const signer = await provider.getSigner()
        const contractAddress = '0x1234567890123456789012345678901234567890' // Replace with actual contract address
        const smartContract = new ethers.Contract(contractAddress, contractABI, signer)
        setContract(smartContract) // This will now work without error
      } catch (error) {
        console.error('Error initializing blockchain:', error)
      }
    }
  }

  const updateGridWithAgents = (agents: Agent[]) => { // Specify the type of agents
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, hasAgent: false })))
    agents.forEach(agent => {
      if (newGrid[agent.y] && newGrid[agent.y][agent.x]) {
        newGrid[agent.y][agent.x].hasAgent = true
      }
    })
    setGrid(newGrid)
  }

  const moveAgentsAlongPath = () => {
    if (dronePaths.length === 0 || currentPathIndex >= dronePaths[0].length) {
      setIsSimulationRunning(false)
      return
    }

    const newAgents = agents.map((agent, index) => {
      if (index < dronePaths.length && currentPathIndex < dronePaths[index].length) {
        const path = dronePaths[index][currentPathIndex]
        let x, y
        if (Array.isArray(path)) {
          [x, y] = path
        } else {
          x = path
          y = path
        }
        if (typeof x === 'number' && typeof y === 'number' &&
            x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          setVisitedCells(prev => [...prev, { x, y }])
          return {
            ...agent,
            x,
            y,
            battery: Math.max(0, agent.battery - 1),
            temperature: agent.temperature + (Math.random() * 2 - 1),
          }
        }
      }
      return agent
    })

    setAgents(newAgents)
    updateGridWithAgents(newAgents)
    setCurrentPathIndex(prev => prev + 1)
  }

  const collectData = () => {
    const newDataPoints: { [key: number]: number } = {}; // Define the type for newDataPoints
    agents.forEach(agent => {
      newDataPoints[agent.id] = (newDataPoints[agent.id] || 0) + Math.floor(Math.random() * 10) + 1
    })
    setDataPoints(newDataPoints)
  }

  const updateBlockchainData = () => {
    const newBlock = {
      time: new Date().toLocaleTimeString(),
      blockHeight: Math.floor(Math.random() * 1000) + 14532879,
      gasPrice: Math.floor(Math.random() * 10) + 30
    }
    setBlockchainData(prev => [...prev.slice(-4), newBlock])
  }

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'agentUpdate':
          setAgents(prev => prev.map(agent => 
            agent.id === data.agentId ? { ...agent, ...data.update } : agent
          ))
          break
        case 'gridUpdate':
          setGrid(data.grid)
          break
        default:
          console.warn('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning)
  }

  const resetSimulation = () => {
    setIsSimulationRunning(false)
    initializeGrid()
    const newAgents = Array(agentCount).fill(null).map((_, index) => ({
      id: index + 1,
      x: 0,
      y: 0,
      battery: 100,
      temperature: 25,
    }))
    setAgents(newAgents)
    updateGridWithAgents(newAgents)
    setDataPoints({})
    setVisitedCells([])
    setCurrentPathIndex(0)
    setDronePaths([]) // Reset to an empty array instead of setting a default path
  }

  const deployAgent = async (agentId: number) => {
    if (contract) {
      try {
        const tx = await contract.deployAgent(agentId)
        await tx.wait()
        console.log(`Agent ${agentId} deployed successfully`)
      } catch (error) {
        console.error('Error deploying agent:', error)
      }
    }
  }

  const handleNodeClick = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId)
    setSelectedAgent(agent as Agent | null)
  }

  const toggleRotation = () => {
    setIsRotating(!isRotating)
  }

  const setCameraView = (view: string) => {
    switch (view) {
      case 'top':
        setCameraPosition([0, 20, 0])
        break
      case '45deg':
        setCameraPosition([14.14, 14.14, 14.14]) // Approximately 45 degrees
        break
      case 'side':
        setCameraPosition([20, 0, 0])
        break
      default:
        setCameraPosition([20, 20, 20])
    }
  }

  const handlePathInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPathInput(event.target.value)
  }

  const processPathInput = () => {
    try {
      const paths = pathInput.split('\n').map(line => 
        line.trim().split(/\s+/).map(coord => {
          const [x, y] = coord.split(',').map(Number)
          if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
            throw new Error(`Invalid coordinate: ${coord}`)
          }
          return [x, y]
        })
      )
      if (paths.length === 0 || paths.some(path => path.length === 0)) {
        throw new Error('Empty path detected')
      }
      setDronePaths(paths)
      setAgentCount(paths.length)
      initializeAgents()
      setCurrentPathIndex(0)
    } catch (error) {
      console.error('Error processing path input:', error)
      alert(`Error processing path input: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Enhanced Multi-Agent Path Planning Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Grid Visualization */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">3D Path Planning Grid</h2>
          <div className="h-[500px]">
            <Canvas camera={{ position: cameraPosition as Vector3, fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <Grid
                size={gridSize}
                agents={agents}
                obstacles={grid.flatMap((row, y) => 
                  row.map((cell, x) => cell.hasObstacle ? { x, z: y } : null)
                ).filter(Boolean)}
                visitedCells={visitedCells}
                connectionRadius={connectionRadius}
                isRotating={isRotating}
              />
              <OrbitControls />
            </Canvas>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={toggleSimulation}>
              {isSimulationRunning ? <><Pause className="mr-2" /> Pause</> : <><Play className="mr-2" /> Start</>}
            </Button>
            <Button onClick={resetSimulation} variant="outline">
              <RotateCcw className="mr-2" /> Reset
            </Button>
            <Button onClick={toggleRotation} variant="outline">
              {isRotating ? <><EyeOff className="mr-2" /> Stop Rotation</> : <><Eye className="mr-2" /> Start Rotation</>}
            </Button>
            <Button onClick={() => setCameraView('top')} variant="outline">Top View</Button>
            <Button onClick={() => setCameraView('45deg')} variant="outline">45° View</Button>
            <Button onClick={() => setCameraView('side')} variant="outline">Side View</Button>
          </div>
        </div>

        {/* Random Topology Generator */}
        <div className="lg:col-span-3">
          <RandomTopologyGenerator />
        </div>

        {/* Agent Controls */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold mb-4">Agent Controls</h2>
          <div className="space-y-2">
            <Label htmlFor="grid-size">Grid Size</Label>
            <Slider
              id="grid-size"
              min={5}
              max={20}
              step={1}
              value={[gridSize]}
              onValueChange={(value) => setGridSize(value[0])}
            />
            <div className="text-sm text-gray-500">{gridSize}x{gridSize}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-count">Number of Agents</Label>
            <Input
              id="agent-count"
              type="number"
              value={agentCount}
              onChange={(e) => setAgentCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 0)))}
              min={1}
              max={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="connection-radius">Connection Radius (Rc)</Label>
            <Slider
              id="connection-radius"
              min={1}
              max={10}
              step={0.5}
              value={[connectionRadius]}
              onValueChange={(value) => setConnectionRadius(value[0])}
            />
            <div className="text-sm text-gray-500">Rc: {connectionRadius}</div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="collision-avoidance"
              checked={collisionAvoidance}
              onCheckedChange={setCollisionAvoidance}
            />
            <Label htmlFor="collision-avoidance">Collision Avoidance</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="path-input">Input Drone Paths</Label>
            <Textarea
              id="path-input"
              placeholder="Enter paths (e.g., 0,0 1,1 2,2)"
              value={pathInput}
              onChange={handlePathInput}
            />
            <Button onClick={processPathInput}>Process Paths</Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-paths">Current Drone Paths</Label>
            <div id="current-paths" className="bg-gray-100 p-2 rounded-md">
              {dronePaths.length > 0 ? (
                dronePaths.map((path, index) => (
                  <div key={index} className="mb-2">
                    <span className="font-semibold">Drone {index + 1}: </span>
                    {path.map(([x, y], pointIndex) => ( // Change here to destructure the tuple
                      <span key={pointIndex}>
                        ({x}, {y})
                        {pointIndex < path.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>
                ))
              ) : (
                <div>No paths set. Use the input above to set drone paths.</div>
              )}
            </div>
          </div>
        </div>

        {/* 3D Information Transfer Graph */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="mr-2" />
            3D Information Transfer Graph
          </h2>
          <div className="h-[300px]">
            <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <InformationTransferGraph agents={agents} onNodeClick={handleNodeClick} />
              <OrbitControls />
            </Canvas>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mt-4">
                <Info className="mr-2 h-4 w-4" /> View Agent Details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Agent Details</DialogTitle>
              </DialogHeader>
              {selectedAgent && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="agent-id" className="text-right">
                      Agent ID
                    </Label>
                    <Input id="agent-id" value={selectedAgent.id} className="col-span-3" readOnly />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="position" className="text-right">
                      Position
                    </Label>
                    <Input id="position" value={`(${selectedAgent.x}, ${selectedAgent.y})`} className="col-span-3" readOnly />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="battery" className="text-right">
                      Battery
                    </Label>
                    <Input id="battery" value={`${selectedAgent.battery}%`} className="col-span-3" readOnly />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="temperature" className="text-right">
                      Temperature
                    </Label>
                    <Input id="temperature" value={`${selectedAgent.temperature.toFixed(1)}°C`} className="col-span-3" readOnly />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Blockchain Information */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Link className="mr-2" />
            Blockchain Status
          </h2>
          <Tabs defaultValue="table">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Network</TableCell>
                    <TableCell>Ethereum</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Latest Block</TableCell>
                    <TableCell>{blockchainData[blockchainData.length - 1]?.blockHeight}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gas Price</TableCell>
                    <TableCell>{blockchainData[blockchainData.length - 1]?.gasPrice} Gwei</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={blockchainData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="blockHeight" stroke="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="gasPrice" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </div>

        {/* Base Station Data */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="mr-2" />
            Base Station
          </h2>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Status</TableCell>
                <TableCell className="text-green-500">Online</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Connected Agents</TableCell>
                <TableCell>{agentCount}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Signal Strength</TableCell>
                <TableCell>Excellent</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Data Collection */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="mr-2" />
            Data Collection
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent ID</TableHead>
                <TableHead>Data Points</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>Agent {agent.id}</TableCell>
                  <TableCell>{dataPoints[agent.id] || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Battery className="mr-2" />
                      {agent.battery}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Thermometer className="mr-2" />
                      {agent.temperature.toFixed(1)}°C
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => deployAgent(agent.id)} size="sm">
                      Deploy
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* System Performance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="mr-2" />
            System Performance
          </h2>
          <div className="space-y-4">
            <div>
              <Label>CPU Usage</Label>
              <Slider defaultValue={[45]} max={100} step={1} />
            </div>
            <div>
              <Label>Memory Usage</Label>
              <Slider defaultValue={[60]} max={100} step={1} />
            </div>
            <div>
              <Label>Network Latency</Label>
              <Slider defaultValue={[25]} max={100} step={1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}