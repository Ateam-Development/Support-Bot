"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams } from 'next/navigation';
import { Save, AlertCircle, CheckCircle, Plus, Layout, Type, MousePointerClick, MessageSquare, StopCircle, Play, Trash2 } from 'lucide-react';
import CustomNode from '@/components/flow/CustomNode';
import CustomEdge from '@/components/flow/CustomEdge';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

const initialNodes = [
    {
        id: 'start',
        type: 'custom',
        position: { x: 250, y: 100 },
        data: { label: 'Start', type: 'start', text: 'Welcome Trigger' },
        deletable: false
    },
];

export default function VisualFlowPage() {
    return (
        <ReactFlowProvider>
            <FlowEditor />
        </ReactFlowProvider>
    );
}

function FlowEditor() {
    const params = useParams();
    const chatbotId = params.chatbotId;
    const reactFlowWrapper = useRef(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);

    const [history, setHistory] = useState({ past: [], future: [] });

    // History Snapshot
    const takeSnapshot = useCallback(() => {
        setHistory(prev => ({
            past: [...prev.past, { nodes, edges }],
            future: []
        }));
    }, [nodes, edges]);

    // Undo/Redo Handlers
    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;
            const newPast = [...prev.past];
            const previousState = newPast.pop();

            setNodes(previousState.nodes);
            setEdges(previousState.edges);

            return {
                past: newPast,
                future: [{ nodes, edges }, ...prev.future]
            };
        });
    }, [nodes, edges, setNodes, setEdges]);

    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;
            const newFuture = [...prev.future];
            const nextState = newFuture.shift();

            setNodes(nextState.nodes);
            setEdges(nextState.edges);

            return {
                past: [...prev.past, { nodes, edges }],
                future: newFuture
            };
        });
    }, [nodes, edges, setNodes, setEdges]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Fetch existing flow
    useEffect(() => {
        if (chatbotId) {
            fetchFlow();
        }
    }, [chatbotId]);

    const fetchFlow = async () => {
        setStatus('loading');
        try {
            const res = await fetch(`/api/flow/${chatbotId}`);
            const data = await res.json();
            if (data.success && data.data && data.data.nodes) {
                // Convert JSON Flow to Visual Nodes/Edges
                const { visualNodes, visualEdges } = convertJsonToVisual(data.data);
                setNodes(visualNodes);
                setEdges(visualEdges);
                setStatus('idle');
            } else {
                setStatus('idle');
            }
        } catch (error) {
            console.error('Error fetching flow:', error);
            setStatus('error');
            setMessage('Failed to load flow');
        }
    };

    const convertJsonToVisual = (flowData) => {
        const visualNodes = [];
        const visualEdges = [];
        let yOffset = 100;

        // Iterate through nodes
        Object.keys(flowData.nodes).forEach((nodeId, index) => {
            const node = flowData.nodes[nodeId];

            // Calculate a rough position if not stored (In a real app, we'd store x/y in the JSON too)
            // For now, simple vertical stack with offset
            const position = node.position || { x: 250, y: yOffset };
            yOffset += 150;

            visualNodes.push({
                id: nodeId,
                type: 'custom',
                position: position,
                data: {
                    label: node.type === 'question' ? 'Question' : (node.type === 'email' ? 'Email Input' : node.type === 'end' ? 'End Flow' : node.type === 'start' ? 'Start' : 'Message'),
                    type: node.type, // 'question' | 'message' | 'email'
                    text: node.text,
                    options: node.options || []
                }
            });

            // Create Edges
            if (node.routes) {
                node.routes.forEach(route => {
                    if (route.next) {
                        visualEdges.push({
                            id: `e-${nodeId}-${route.next}`,
                            source: nodeId,
                            target: route.next,
                            sourceHandle: `option-${route.value}`, // Must match Handle ID
                            type: 'custom',
                            animated: true,
                            markerEnd: { type: MarkerType.ArrowClosed },
                        });
                    }
                });
            } else if (node.next) {
                visualEdges.push({
                    id: `e-${nodeId}-${node.next}`,
                    source: nodeId,
                    target: node.next,
                    sourceHandle: 'default',
                    type: 'custom',
                    animated: true,
                    markerEnd: { type: MarkerType.ArrowClosed },
                });
            }
        });

        // Ensure Start Node exists if missing (legacy data)
        if (!visualNodes.find(n => n.id === flowData.startNodeId)) {
            visualNodes.unshift({
                id: flowData.startNodeId || 'start',
                type: 'custom',
                position: { x: 250, y: 50 },
                data: { label: 'Start', type: 'start', text: 'Start' }
            });
        }

        return { visualNodes, visualEdges };
    };

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, type: 'custom', animated: true }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            // project was renamed to screenToFlowPosition
            // and you don't need to subtract the reactFlowBounds.left/top anymore
            // details: https://reactflow.dev/whats-new/2023-11-10
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `node_${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    label: type === 'question' ? 'New Question' : (type === 'email' ? 'Email Input' : type === 'end' ? 'End Flow' : type === 'start' ? 'Start' : 'New Message'),
                    type: type,
                    text: type === 'question' ? 'Ask a question...' : (type === 'email' ? 'Please enter your email address:' : type === 'end' ? 'Thank you!' : type === 'start' ? 'Welcome! How can I help?' : 'Send a message...'),
                    options: type === 'question' ? ['Yes', 'No'] : []
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const handleNodeClick = (event, node) => {
        setSelectedNode(node);
    };

    const updateNodeData = (nodeId, newData) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
        // Also update selected node state to reflect changes in UI sidebar
        setSelectedNode(prev => prev.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev);
    };

    const convertVisualToJson = () => {
        // Find the node that has type 'start'
        const foundStartNode = nodes.find(n => n.data.type === 'start');

        console.log('ConvertVisualToJson: Total nodes:', nodes.length);
        console.log('ConvertVisualToJson: Found Start Node:', foundStartNode ? foundStartNode.id : 'NOT FOUND');
        console.log('ConvertVisualToJson: All node IDs:', nodes.map(n => `${n.id}(${n.data.type})`).join(', '));

        const jsonFlow = {
            enabled: true,
            startNodeId: foundStartNode ? foundStartNode.id : 'start',
            nodes: {}
        };

        nodes.forEach(node => {
            // Skip purely visual decoration nodes if any

            const nodeData = {
                type: node.data.type || 'message',
                text: node.data.text,
                options: node.data.options,
                position: node.position
            };

            // Calculate Routes based on Edges
            const nodeEdges = edges.filter(e => e.source === node.id);

            if (nodeData.type === 'question') {
                nodeData.routes = [];
                nodeEdges.forEach(edge => {
                    // sourceHandle is "option-Sales" -> value is "Sales"
                    let value = edge.sourceHandle?.replace('option-', '') || '';
                    nodeData.routes.push({
                        condition: 'equals',
                        value: value,
                        next: edge.target
                    });
                });
            } else if (nodeData.type === 'email') {
                // Email node -> Single 'next', plus validation
                nodeData.validation = 'email';
                nodeData.saveAs = 'email';
                if (nodeEdges.length > 0) {
                    nodeData.next = nodeEdges[0].target;
                }
            } else if (nodeData.type === 'end') {
                // End node -> No Next, No Routes
            } else if (nodeData.type === 'start') {
                // Start Node behaves like a Message Node (has next)
                if (nodeEdges.length > 0) {
                    nodeData.next = nodeEdges[0].target;
                }
            } else {
                // Message node -> Single 'next'
                if (nodeEdges.length > 0) {
                    nodeData.next = nodeEdges[0].target;
                }
            }

            jsonFlow.nodes[node.id] = nodeData;
        });

        return jsonFlow;
    };


    const handleSave = async () => {
        // Validation: Ensure Start Node exists
        const startNodeExists = nodes.some(n => n.data.type === 'start');
        if (!startNodeExists) {
            setStatus('error');
            setMessage('Error: Missing "Start Flow" node. Please drag it from the sidebar.');
            return;
        }

        setStatus('saving');
        setMessage('');

        try {
            const flowData = convertVisualToJson();

            const res = await fetch(`/api/flow/${chatbotId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(flowData)
            });

            const data = await res.json();
            if (data.success) {
                setStatus('success');
                setMessage('Flow saved successfully');
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
                setMessage('Failed to save');
            }
        } catch (error) {
            console.error('Error saving flow:', error);
            setStatus('error');
            setMessage('An unexpected error occurred');
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a]">
            {/* Toolbar / Sidebar */}
            <div className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <h2 className="text-white font-bold text-lg mb-1">Flow Builder</h2>
                    <p className="text-xs text-gray-500">Drag nodes to the canvas</p>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    <div
                        className="p-3 bg-green-600/10 border border-green-600/30 rounded-lg cursor-grab hover:bg-green-600/20 transition-colors flex items-center gap-3"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'start')}
                        draggable
                    >
                        <Play size={20} className="text-green-400" />
                        <div>
                            <div className="text-sm font-medium text-white">Start Flow</div>
                            <div className="text-xs text-gray-400">Entry Point</div>
                        </div>
                    </div>
                    <div
                        className="p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg cursor-grab hover:bg-blue-600/20 transition-colors flex items-center gap-3"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'question')}
                        draggable
                    >
                        <Layout size={20} className="text-blue-400" />
                        <div>
                            <div className="text-sm font-medium text-white">Question</div>
                            <div className="text-xs text-gray-400">Ask the user + Branch</div>
                        </div>
                    </div>

                    <div
                        className="p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg cursor-grab hover:bg-purple-600/20 transition-colors flex items-center gap-3"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'message')}
                        draggable
                    >
                        <MessageSquare size={20} className="text-purple-400" />
                        <div>
                            <div className="text-sm font-medium text-white">Message</div>
                            <div className="text-xs text-gray-400">Send text info</div>
                        </div>
                    </div>

                    <div
                        className="p-3 bg-orange-600/10 border border-orange-600/30 rounded-lg cursor-grab hover:bg-orange-600/20 transition-colors flex items-center gap-3"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'email')}
                        draggable
                    >
                        <Save size={20} className="text-orange-400" />
                        <div>
                            <div className="text-sm font-medium text-white">Email</div>
                            <div className="text-xs text-gray-400">Capture User Email</div>
                        </div>
                    </div>

                    <div
                        className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg cursor-grab hover:bg-red-600/20 transition-colors flex items-center gap-3"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'end')}
                        draggable
                    >
                        <StopCircle size={20} className="text-red-400" />
                        <div>
                            <div className="text-sm font-medium text-white">End Flow</div>
                            <div className="text-xs text-gray-400">End & Transition to AI</div>
                        </div>
                    </div>
                </div>


                {/* Properties Panel (Bottom Left or Replacing Toolbar when selected?) */}
                {/* Let's keep it simple: Toolbar always visible, Properties below if selected */}
                {selectedNode && (
                    <div className="p-4 border-t border-white/5 bg-[#111]">
                        <div className="mb-2 text-xs font-bold text-gray-500 uppercase">Properties</div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Text Content</label>
                                <textarea
                                    className="w-full bg-[#222] border border-white/10 rounded p-2 text-sm text-white resize-none h-20"
                                    value={selectedNode.data.text}
                                    onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                                />
                            </div>

                            {selectedNode.data.type === 'question' && (
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Options</label>
                                    <div className="space-y-2">
                                        {(selectedNode.data.options || []).map((option, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    className="flex-1 bg-[#222] border border-white/10 rounded p-2 text-sm text-white"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(selectedNode.data.options || [])];
                                                        newOptions[index] = e.target.value;
                                                        updateNodeData(selectedNode.id, { options: newOptions });
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newOptions = selectedNode.data.options.filter((_, i) => i !== index);
                                                        updateNodeData(selectedNode.id, { options: newOptions });
                                                    }}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newOptions = [...(selectedNode.data.options || []), 'New Option'];
                                                updateNodeData(selectedNode.id, { options: newOptions });
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                                        >
                                            <Plus size={12} /> Add Option
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    takeSnapshot(); // Snapshot before delete
                                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                                    setSelectedNode(null);
                                }}
                                className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-xs hover:bg-red-500/20"
                            >
                                Delete Node
                            </button>
                        </div>
                    </div>
                )}


                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleSave}
                        disabled={status === 'saving'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
                    >
                        {status === 'saving' ? 'Saving...' : <><Save size={18} /> Save Flow</>}
                    </button>
                    {message && (
                        <div className={`mt-2 text-xs text-center ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={(params) => {
                        takeSnapshot();
                        onConnect(params);
                    }}
                    deleteKeyCode={['Backspace', 'Delete']}
                    onInit={setReactFlowInstance}
                    onDrop={(e) => {
                        takeSnapshot();
                        onDrop(e);
                    }}
                    onDragOver={onDragOver}
                    onNodeDragStart={takeSnapshot} // Snapshot before dragging starts
                    onNodeClick={handleNodeClick}
                    fitView
                    className="bg-[#000]"
                >       <Background color="#222" gap={16} />
                    <Controls className="bg-[#1a1a1a] border border-white/10 fill-white text-white" />
                </ReactFlow>
            </div>
        </div>
    );
}
