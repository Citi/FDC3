import { MessageHandler } from "../BasicFDC3Server";
import { AgentRequestMessage } from "@finos/fdc3/dist/bridging/BridgingTypes";
import { ServerContext } from "../ServerContext";
import { PrivateChannelOnAddContextListenerAgentRequest, PrivateChannelOnUnsubscribeAgentRequest, PrivateChannelBroadcastAgentRequest } from "@finos/fdc3/dist/bridging/BridgingTypes";

type ListenerRegistration = {
    appId: string,
    instanceId: string,
    channelId: string,
    contextType: string | null
}

function matches(lr1: ListenerRegistration, lr2: ListenerRegistration) : boolean {
    return (lr1.appId == lr2.appId) &&
        (lr1.instanceId == lr2.instanceId) &&
        (lr1.channelId == lr2.channelId) && 
        (lr1.contextType == lr2.contextType)
}

function createListenerRegistration(msg: 
    PrivateChannelOnAddContextListenerAgentRequest | 
    PrivateChannelOnUnsubscribeAgentRequest) : ListenerRegistration {

        return {
            appId: msg.meta.source?.appId!!,
            instanceId: msg.meta.source?.instanceId!!,
            channelId: msg.payload.channelId,
            contextType: msg.payload.contextType
        }
}

export class BroadcastHandler implements MessageHandler {

    private regs: ListenerRegistration[] = []
    
    accept(msg: AgentRequestMessage, sc: ServerContext)  {
        switch(msg.type as string /* 1165, see below */) {
            case 'PrivateChannel.broadcast': return this.handleBroadcast(msg as PrivateChannelBroadcastAgentRequest, sc)
            case 'PrivateChannel.onAddContextListener': return this.handleOnAddContextListener(msg as PrivateChannelOnAddContextListenerAgentRequest, sc)
            case 'PrivateChannel.onUnsubscribe': return this.handleOnUnsubscribe(msg as PrivateChannelOnUnsubscribeAgentRequest, sc)

            // temporary, while we wait for https://github.com/finos/FDC3/issues/1165
            case 'broadcast': return this.handleBroadcast(msg as PrivateChannelBroadcastAgentRequest, sc)
            case 'onAddContextListener': return this.handleOnAddContextListener(msg as PrivateChannelOnAddContextListenerAgentRequest, sc)
            case 'onUnsubscribe': return this.handleOnUnsubscribe(msg as PrivateChannelOnUnsubscribeAgentRequest, sc)

        }
    }

    handleOnUnsubscribe(arg0: PrivateChannelOnUnsubscribeAgentRequest, _sc: ServerContext) {
        const lr = createListenerRegistration(arg0)
        const fi = this.regs.findIndex((e) => matches(e, lr))
        if (fi > -1) {
            this.regs.splice(fi, 1)
        }
    }

    handleOnAddContextListener(arg0: PrivateChannelOnAddContextListenerAgentRequest, _sc: ServerContext) {
        const lr = createListenerRegistration(arg0)
        this.regs.push(lr)
    }

    handleBroadcast(arg0: PrivateChannelBroadcastAgentRequest, sc: ServerContext) {
        const channelId = arg0.payload.channelId
        const contextType = arg0.payload.context.type

        this.regs
            .filter(r => {
                return (r.channelId == channelId) && ((r.contextType == null) || (r.contextType == contextType))
            })
            .forEach(r => {
                // forward on the broadcast message with added destination details
                const out = {
                    meta: {
                        source: arg0.meta.source,
                        destination: {
                            appId: r.appId,
                            instanceId: r.instanceId
                        },
                        requestUuid: arg0.meta.requestUuid,
                        timestamp: arg0.meta.timestamp
                    },
                    type: arg0.type,
                    payload: arg0.payload
                }

                sc.post(out)
            })
    }
} 


