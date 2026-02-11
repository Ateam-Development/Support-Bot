const { FlowEngine } = require('./lib/flow-engine.js');

// Mock Flow Data (Based on user's flow)
const flowData = {
    startNodeId: 'node_1768802061795', // Manually set to the first node I saw earlier
    nodes: {
        "node_1768802061795": {
            "type": "message",
            "text": "Hii Aliens!!",
            "options": [],
            "position": { "x": 553, "y": 40 },
            "next": "node_1768802072278"
        },
        "node_1768802072278": {
            "type": "question",
            "text": "Want support?",
            "options": ["Yes", "No"],
            "position": { "x": 1162, "y": 326 },
            "routes": []
        }
    }
};

const engine = new FlowEngine(flowData);

console.log("--- Testing Get Start Sequence ---");
try {
    const sequence = engine.getStartSequence();
    console.log("Sequence Result:", JSON.stringify(sequence, null, 2));

    if (!sequence || !sequence.messages || sequence.messages.length === 0) {
        console.error("FAIL: No sequence returned.");
    } else {
        console.log("PASS: Sequence returned.");
        if (sequence.messages[0].text !== "Hii Aliens!!") console.error("FAIL: Message 1 text mismatch");
        if (sequence.messages[1].text !== "Want support?") console.error("FAIL: Message 2 text mismatch");
    }

} catch (e) {
    console.error("CRASH:", e);
}
