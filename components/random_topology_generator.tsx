import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'

type Node = {
  id: number;
  position: THREE.Vector3;
  connections: number[];
}

type Transmission = {
  from: number;
  to: number;
  timestamp: number;
}

export default function RandomTopologyGenerator() {
  const [nodeCount, setNodeCount] = useState(5)
  const [nodes, setNodes] = useState<Node[]>([])
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current)
      }
    }
  }, [])

  const generateTopology = () => {
    const newNodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: i,
        position: new THREE.Vector3(
          Math.random() * 10 - 5,
          Math.random() * 10 - 5,
          Math.random() * 10 - 5
        ),
        connections: []
      })
    }

    // Ensure connectivity
    for (let i = 1; i < nodeCount; i++) {
      const randomPreviousNode = Math.floor(Math.random() * i)
      newNodes[i].connections.push(randomPreviousNode)
      newNodes[randomPreviousNode].connections.push(i)
    }

    // Add some random additional connections
    for (let i = 0; i < nodeCount; i++) {
      const connectionCount = Math.floor(Math.random() * 3) + 1 // 1 to 3 additional connections
      for (let j = 0; j < connectionCount; j++) {
        const randomNode = Math.floor(Math.random() * nodeCount)
        if (randomNode !== i && !newNodes[i].connections.includes(randomNode)) {
          newNodes[i].connections.push(randomNode)
          newNodes[randomNode].connections.push(i)
        }
      }
    }

    setNodes(newNodes)
    setTransmissions([])
  }

  const startSimulation = () => {
    setIsSimulating(true)
    simulationInterval.current = setInterval(() => {
      const randomNode = Math.floor(Math.random() * nodes.length)
      const sourceNode = nodes[randomNode]
      if (sourceNode.connections.length > 0) {
        const targetNodeIndex = Math.floor(Math.random() * sourceNode.connections.length)
        const targetNodeId = sourceNode.connections[targetNodeIndex]
        setTransmissions(prev => [
          ...prev,
          { from: sourceNode.id, to: targetNodeId, timestamp: Date.now() }
        ].slice(-10)) // Keep only the last 10 transmissions
      }
    }, 1000) // Simulate a transmission every second
  }

  const stopSimulation = () => {
    setIsSimulating(false)
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Random Topology Generator</h2>
      <div className="flex items-center space-x-4">
        <Label htmlFor="node-count">Number of Nodes:</Label>
        <Input
          id="node-count"
          type="number"
          value={nodeCount}
          onChange={(e) => setNodeCount(Math.max(2, parseInt(e.target.value) || 2))}
          className="w-20"
        />
        <Button onClick={generateTopology}>Generate Topology</Button>
        {nodes.length > 0 && (
          <>
            <Button onClick={startSimulation} disabled={isSimulating}>Start Simulation</Button>
            <Button onClick={stopSimulation} disabled={!isSimulating}>Stop Simulation</Button>
          </>
        )}
      </div>
      
      {nodes.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Topology Visualization</h3>
            <div className="h-[400px]">
              <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                {nodes.map((node) => (
                  <React.Fragment key={node.id}>
                    <Sphere position={node.position} args={[0.2, 32, 32]}>
                      <meshStandardMaterial color="blue" />
                    </Sphere>
                    {node.connections.map((targetId) => (
                      <Line
                        key={`${node.id}-${targetId}`}
                        points={[node.position, nodes[targetId].position]}
                        color="gray"
                        lineWidth={1}
                      />
                    ))}
                  </React.Fragment>
                ))}
                <OrbitControls />
              </Canvas>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Recent Transmissions</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transmissions.map((transmission, index) => (
                  <TableRow key={index}>
                    <TableCell>Node {transmission.from}</TableCell>
                    <TableCell>Node {transmission.to}</TableCell>
                    <TableCell>{new Date(transmission.timestamp).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}