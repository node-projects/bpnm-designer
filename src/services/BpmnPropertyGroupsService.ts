import { IDesignItem, PropertyGroupsService } from '@node-projects/web-component-designer';

export class BpmnPropertyGroupsService extends PropertyGroupsService {
  override getPropertygroups(designItems: IDesignItem[]) {
    const groups = super.getPropertygroups(designItems);

    // Keep the BPMN/custom element properties only.
    // Generic CSS/HTML groups are not persisted in BPMN XML and add noise.
    return groups.filter(group => group.name === 'properties');
  }
}
