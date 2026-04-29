export const defaultBpmnDocument = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="https://node-projects.github.io/bpmn-editor">
  <bpmn:process id="Process_Operations" isExecutable="false">
    <bpmn:laneSet id="LaneSet_Operations">
      <bpmn:lane id="Lane_Intake" name="Intake">
        <bpmn:flowNodeRef>StartEvent_Request</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Review</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>BoundaryEvent_SLA</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_Priority</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_SendPlan</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Fulfillment" name="Fulfillment">
        <bpmn:flowNodeRef>Task_Escalate</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Prepare</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_Complete</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_Request" name="Incoming request">
      <bpmn:messageEventDefinition />
    </bpmn:startEvent>
    <bpmn:task id="Task_Review" name="Review request">
      <bpmn:documentation>Validate scope and supporting files before committing the team.</bpmn:documentation>
    </bpmn:task>
    <bpmn:boundaryEvent id="BoundaryEvent_SLA" name="SLA risk" attachedToRef="Task_Review">
      <bpmn:timerEventDefinition />
    </bpmn:boundaryEvent>
    <bpmn:manualTask id="Task_Escalate" name="Escalate blockers" />
    <bpmn:exclusiveGateway id="Gateway_Priority" name="Priority?" />
    <bpmn:sendTask id="Task_SendPlan" name="Send rollout plan" />
    <bpmn:serviceTask id="Task_Prepare" name="Prepare shipment" />
    <bpmn:dataObjectReference id="DataObject_Brief" name="Order brief" />
    <bpmn:endEvent id="EndEvent_Complete" name="Delivered">
      <bpmn:terminateEventDefinition />
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Request" sourceRef="StartEvent_Request" targetRef="Task_Review" />
    <bpmn:sequenceFlow id="Flow_Review" sourceRef="Task_Review" targetRef="Gateway_Priority" />
    <bpmn:sequenceFlow id="Flow_Send" sourceRef="Gateway_Priority" targetRef="Task_SendPlan" />
    <bpmn:sequenceFlow id="Flow_Prepare" sourceRef="Task_SendPlan" targetRef="Task_Prepare" />
    <bpmn:sequenceFlow id="Flow_Done" sourceRef="Task_Prepare" targetRef="EndEvent_Complete" />
    <bpmn:sequenceFlow id="Flow_EscalateTrigger" sourceRef="BoundaryEvent_SLA" targetRef="Task_Escalate" />
    <bpmn:sequenceFlow id="Flow_EscalateJoin" sourceRef="Task_Escalate" targetRef="Task_Prepare" />
  </bpmn:process>
  <bpmn:process id="Process_Finance" isExecutable="false">
    <bpmn:laneSet id="LaneSet_Finance">
      <bpmn:lane id="Lane_Finance" name="Funding">
        <bpmn:flowNodeRef>Task_ReceivePlan</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_ConfirmFunding</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_Finance</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:receiveTask id="Task_ReceivePlan" name="Receive rollout plan" />
    <bpmn:userTask id="Task_ConfirmFunding" name="Confirm funding" />
    <bpmn:endEvent id="EndEvent_Finance" name="Ready to pay" />
    <bpmn:sequenceFlow id="Flow_FinanceStart" sourceRef="Task_ReceivePlan" targetRef="Task_ConfirmFunding" />
    <bpmn:sequenceFlow id="Flow_FinanceDone" sourceRef="Task_ConfirmFunding" targetRef="EndEvent_Finance" />
  </bpmn:process>
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_Operations" name="Operations" processRef="Process_Operations" />
    <bpmn:participant id="Participant_Finance" name="Finance" processRef="Process_Finance" />
    <bpmn:messageFlow id="MessageFlow_Plan" name="Rollout plan" sourceRef="Task_SendPlan" targetRef="Task_ReceivePlan" />
    <bpmn:textAnnotation id="TextAnnotation_Reminder">
      <bpmn:text>Use the context pad to recolor, replace, or annotate the selected element.</bpmn:text>
    </bpmn:textAnnotation>
    <bpmn:group id="Group_Shipping" name="Fulfillment focus" />
    <bpmn:association id="Association_Reminder" sourceRef="Task_Review" targetRef="TextAnnotation_Reminder" />
  </bpmn:collaboration>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_Operations_di" bpmnElement="Participant_Operations" bioc:fill="#eef7f2" bioc:stroke="#2b675b">
        <dc:Bounds x="90" y="90" width="640" height="320" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Participant_Finance_di" bpmnElement="Participant_Finance" bioc:fill="#eef4fb" bioc:stroke="#3b6e8a">
        <dc:Bounds x="790" y="90" width="470" height="320" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Intake_di" bpmnElement="Lane_Intake">
        <dc:Bounds x="90" y="90" width="640" height="150" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Fulfillment_di" bpmnElement="Lane_Fulfillment">
        <dc:Bounds x="90" y="240" width="640" height="170" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Finance_di" bpmnElement="Lane_Finance">
        <dc:Bounds x="790" y="90" width="470" height="320" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_Request_di" bpmnElement="StartEvent_Request" bioc:fill="#eaf8f4" bioc:stroke="#2b675b">
        <dc:Bounds x="150" y="136" width="56" height="56" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Review_di" bpmnElement="Task_Review" bioc:fill="#fff7d9" bioc:stroke="#b66d0a">
        <dc:Bounds x="250" y="116" width="150" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BoundaryEvent_SLA_di" bpmnElement="BoundaryEvent_SLA" bioc:fill="#ffffff" bioc:stroke="#b66d0a">
        <dc:Bounds x="354" y="192" width="44" height="44" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Priority_di" bpmnElement="Gateway_Priority">
        <dc:Bounds x="460" y="124" width="82" height="82" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_SendPlan_di" bpmnElement="Task_SendPlan" bioc:fill="#eef6ff" bioc:stroke="#376d82">
        <dc:Bounds x="560" y="116" width="150" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Escalate_di" bpmnElement="Task_Escalate" bioc:fill="#fff0ea" bioc:stroke="#b95f39">
        <dc:Bounds x="210" y="286" width="150" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DataObject_Brief_di" bpmnElement="DataObject_Brief">
        <dc:Bounds x="390" y="282" width="96" height="104" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Prepare_di" bpmnElement="Task_Prepare" bioc:fill="#ebf7f2" bioc:stroke="#216354">
        <dc:Bounds x="420" y="286" width="150" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Complete_di" bpmnElement="EndEvent_Complete" bioc:fill="#ffffff" bioc:stroke="#216354">
        <dc:Bounds x="620" y="309" width="56" height="56" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ReceivePlan_di" bpmnElement="Task_ReceivePlan" bioc:fill="#eef6ff" bioc:stroke="#376d82">
        <dc:Bounds x="840" y="136" width="152" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ConfirmFunding_di" bpmnElement="Task_ConfirmFunding" bioc:fill="#fff2f2" bioc:stroke="#8a4b4b">
        <dc:Bounds x="1020" y="136" width="150" height="98" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Finance_di" bpmnElement="EndEvent_Finance" bioc:fill="#ffffff" bioc:stroke="#3b6e8a">
        <dc:Bounds x="1185" y="157" width="56" height="56" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="TextAnnotation_Reminder_di" bpmnElement="TextAnnotation_Reminder" bioc:fill="#fffbe8" bioc:stroke="#8d7a16">
        <dc:Bounds x="230" y="24" width="240" height="112" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Group_Shipping_di" bpmnElement="Group_Shipping" bioc:fill="#f4fbf8" bioc:stroke="#4e7b70">
        <dc:Bounds x="388" y="264" width="312" height="140" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Request_di" bpmnElement="Flow_Request">
        <di:waypoint x="206" y="164" />
        <di:waypoint x="250" y="165" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Review_di" bpmnElement="Flow_Review">
        <di:waypoint x="400" y="165" />
        <di:waypoint x="460" y="165" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Send_di" bpmnElement="Flow_Send">
        <di:waypoint x="542" y="165" />
        <di:waypoint x="560" y="165" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Prepare_di" bpmnElement="Flow_Prepare">
        <di:waypoint x="635" y="214" />
        <di:waypoint x="635" y="250" />
        <di:waypoint x="495" y="250" />
        <di:waypoint x="495" y="286" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Done_di" bpmnElement="Flow_Done">
        <di:waypoint x="570" y="335" />
        <di:waypoint x="620" y="335" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_EscalateTrigger_di" bpmnElement="Flow_EscalateTrigger">
        <di:waypoint x="376" y="236" />
        <di:waypoint x="376" y="261" />
        <di:waypoint x="285" y="261" />
        <di:waypoint x="285" y="286" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_EscalateJoin_di" bpmnElement="Flow_EscalateJoin">
        <di:waypoint x="360" y="335" />
        <di:waypoint x="420" y="335" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_FinanceStart_di" bpmnElement="Flow_FinanceStart">
        <di:waypoint x="992" y="185" />
        <di:waypoint x="1020" y="185" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_FinanceDone_di" bpmnElement="Flow_FinanceDone">
        <di:waypoint x="1170" y="185" />
        <di:waypoint x="1185" y="185" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="MessageFlow_Plan_di" bpmnElement="MessageFlow_Plan" bioc:stroke="#376d82">
        <di:waypoint x="710" y="165" />
        <di:waypoint x="770" y="165" />
        <di:waypoint x="770" y="185" />
        <di:waypoint x="840" y="185" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Association_Reminder_di" bpmnElement="Association_Reminder" bioc:stroke="#8d7a16">
        <di:waypoint x="325" y="116" />
        <di:waypoint x="325" y="132" />
        <di:waypoint x="350" y="132" />
        <di:waypoint x="350" y="136" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;