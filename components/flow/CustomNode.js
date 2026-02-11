import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageCircle, HelpCircle, ArrowRight, Mail, StopCircle, Play } from 'lucide-react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="shadow-lg rounded-xl border border-gray-700 bg-[#1a1a1a] min-w-[250px] overflow-hidden">
            {/* Header */}
            <div className={`p-3 border-b flex items-center gap-2 ${data.type === 'question' ? 'bg-blue-600/20 border-blue-600/30' :
                data.type === 'message' ? 'bg-purple-600/20 border-purple-600/30' :
                    data.type === 'email' ? 'bg-orange-600/20 border-orange-600/30' :
                        data.type === 'end' ? 'bg-red-600/20 border-red-600/30' :
                            data.type === 'start' ? 'bg-green-600/20 border-green-600/30' :
                                'bg-gray-600/20 border-gray-600/30'
                }`}>
                {data.type === 'question' && <HelpCircle size={16} className="text-blue-400" />}
                {data.type === 'message' && <MessageCircle size={16} className="text-purple-400" />}
                {data.type === 'email' && <Mail size={16} className="text-orange-400" />}
                {data.type === 'end' && <StopCircle size={16} className="text-red-400" />}
                {data.type === 'start' && <Play size={16} className="text-green-400" />}
                {!data.type && <div className="w-4 h-4 rounded-full bg-green-500" />}
                <span className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    {data.label || (data.type === 'question' ? 'Question' : data.type === 'email' ? 'Email' : data.type === 'end' ? 'End Flow' : data.type === 'start' ? 'Start' : 'Message')}
                </span>
            </div>

            {/* Body */}
            <div className="p-4">
                <div className="text-sm text-gray-300 mb-3 font-medium">
                    {data.text || "Enter text..."}
                </div>

                {/* Input Handle (Entry) */}
                {data.type !== 'start' && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        isConnectable={isConnectable}
                        className="w-3 h-3 bg-gray-400"
                    />
                )}


                {/* Outputs */}
                <div className="space-y-2">
                    {/* If it is a Question with Options */}
                    {data.type === 'question' && data.options && data.options.length > 0 ? (
                        data.options.map((option, index) => (
                            <div key={index} className="relative flex items-center justify-end">
                                <span className="text-xs text-blue-400 mr-3">{option}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`option-${option}`}
                                    isConnectable={isConnectable}
                                    className="w-3 h-3 bg-blue-500 top-1/2 -translate-y-1/2 right-[-19px] !important"
                                    style={{ right: '-9px' }}
                                />
                            </div>
                        ))
                    ) : (
                        // Single Output (Default)
                        <div className="relative flex items-center justify-end h-4">
                            {data.type !== 'end' && (
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id="default"
                                    isConnectable={isConnectable}
                                    className="w-3 h-3 bg-gray-400"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
