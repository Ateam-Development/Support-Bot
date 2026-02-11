
export class FlowEngine {
    constructor(flowDef) {
        this.flow = flowDef;
    }

    /**
     * Get the chain of start messages.
     * Traverses through 'message' nodes until it hits a 'question' or end.
     */
    getStartSequence() {
        console.log("FlowEngine: Starting sequence generation. StartNodeId:", this.flow.startNodeId);

        if (!this.flow.startNodeId) {
            console.error("FlowEngine: No startNodeId in flow definition.");
            return null;
        }

        let currentNodeId = this.flow.startNodeId;

        // FALLBACK: If startNodeId is invalid/missing, try to find a node with type 'start'
        if (this.flow.nodes) {
            console.log(`FlowEngine: Checking node ${currentNodeId}. Exists: ${!!this.flow.nodes[currentNodeId]}`);
        } else {
            console.error("FlowEngine: Critical - this.flow.nodes is undefined/null");
        }

        if (!currentNodeId || !this.flow.nodes[currentNodeId]) {
            const startNodeEntry = Object.entries(this.flow.nodes || {}).find(([_, node]) => node.type === 'start');
            if (startNodeEntry) {
                console.log(`FlowEngine: Start Node ID ${currentNodeId} invalid, auto-detected start node: ${startNodeEntry[0]}`);
                currentNodeId = startNodeEntry[0];
            } else {
                console.error(`FlowEngine: Start Node Lookup FAILED. ID: ${currentNodeId} not found, and Autodetect found nothing.`);
            }
        }

        const messages = [];
        let finalNodeId = currentNodeId;
        let isComplete = false;

        // Traverse
        while (currentNodeId) {
            console.log(`FlowEngine: Traversing node: ${currentNodeId}`);
            const node = this.flow.nodes[currentNodeId];
            if (!node) {
                console.error(`FlowEngine: Node ${currentNodeId} not found in definition.`);
                break;
            }

            messages.push({
                text: node.text,
                options: node.options || [],
                type: node.type
            });

            finalNodeId = currentNodeId; // Track the node we just added

            // If it is a Question OR Email, STOP traversing and wait for user input.
            if (node.type === 'question' || node.type === 'email') {
                break;
            } else if (node.type === 'end') {
                isComplete = true;
                currentNodeId = null;
                break;
            }

            // If it is a Message, go to NEXT immediately using logic
            // Message nodes usually just have 'next' or empty 'routes'
            if (node.next) {
                currentNodeId = node.next;
            } else if (node.routes && node.routes.length > 0) {
                // Even a message node might have a 'default' route or unconditional route
                // For now, assume Message nodes use 'next' property primarily.
                // If routes exist, we can't determine next without input? 
                // Actually, if it' a MESSAGE node, it shouldn't depend on user input.
                // So we assume it auto-proceeds.
                currentNodeId = null; // No auto 'next' known without input?
                isComplete = true; // ???
                break;
            } else {
                // End of line
                currentNodeId = null;
                isComplete = true;
            }
        }

        return {
            messages, // Array of {text, options}
            currentStepId: finalNodeId,
            isComplete
        };
    }

    /**
     * Process a user message against the current flow state.
     */
    processMessage(currentState, userMessage) {
        const currentStepId = currentState?.currentStepId || this.flow.startNodeId;
        const currentNode = this.flow.nodes[currentStepId];

        if (!currentNode) {
            return { error: 'Node not found' };
        }

        // 1. Validate Input (if applicable)
        if (currentNode.validation) {
            if (currentNode.validation === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(userMessage)) {
                    return {
                        nextStepId: currentStepId,
                        messages: [{ text: currentNode.errorMessage || "Please enter a valid email address.", options: [] }],
                        isComplete: false
                    };
                }
            }
        }

        // 2. Determine Branch
        let nextStepId = null;

        if (currentNode.routes) {
            // Check conditions
            for (const route of currentNode.routes) {
                if (this.evaluateCondition(route, userMessage)) {
                    nextStepId = route.next;
                    break;
                }
            }
        } else if (currentNode.next) {
            nextStepId = currentNode.next;
        }

        // Fallback catch
        if (!nextStepId) {
            // If no match found for a QUESTION node
            // We should ask the question again or say "Invalid option"
            // Assuming explicit options matching:
            let msg = "I didn't understand that. Please try again.";
            if (currentNode.options && currentNode.options.length > 0) {
                msg = `Please select one of the options: ${currentNode.options.join(', ')}`;
            }
            return {
                nextStepId: currentStepId,
                messages: [{ text: msg, options: currentNode.options || [] }],
                isComplete: false
            };
        }

        // 3. Traverse from Next Step (Chain Messages)
        // We have the User's answer to Current Step.
        // Now we move to Next Step.
        // If Next Step is "Message", we Auto-Traverse until we hit "Question" or End.

        let traversalId = nextStepId;
        const responseMessages = [];
        let finalNodeId = traversalId;
        let isComplete = false;
        let capturedData = (currentNode.saveAs || currentNode.type === 'email') ?
            { [currentNode.saveAs || 'email']: userMessage } : null; // Capture data from current step

        // Anti-infinite loop
        let attempts = 0;

        while (traversalId && attempts < 20) {
            const node = this.flow.nodes[traversalId];
            if (!node) break;

            responseMessages.push({
                text: node.text,
                options: node.options || [],
                type: node.type
            });

            finalNodeId = traversalId;
            attempts++;

            // Should we stop?
            if (node.type === 'question' || node.type === 'email') {
                // STOP at question or email
                break;
            } else if (node.type === 'end') {
                // Explicit END node
                isComplete = true;
                traversalId = null; // Ensure we stop here
                break;
            } else {
                // Message node -> Auto Next
                if (node.next) {
                    traversalId = node.next;
                } else {
                    // End of flow (Message node with no next)
                    traversalId = null;
                    isComplete = true;
                }
            }
        }

        return {
            nextStepId: finalNodeId,
            messages: responseMessages,
            isComplete: isComplete,
            capturedData: capturedData
        };
    }

    evaluateCondition(route, userMessage) {
        const input = userMessage.toLowerCase().trim();
        const value = (route.value || '').toLowerCase();

        switch (route.condition) {
            case 'equals':
                return input === value;
            case 'contains':
                return input.includes(value);
            case 'default':
                return true;
            default:
                return false;
        }
    }

    getStartNode() {
        // Wrapper for compatibility, but prefer getStartSequence for logic
        if (!this.flow.startNodeId) return null;
        return this.flow.nodes[this.flow.startNodeId];
    }
}
