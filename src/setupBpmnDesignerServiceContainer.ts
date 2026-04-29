import {
  AltToEnterContainerExtensionProvider,
  BaseCustomWebComponentPropertiesService,
  CopyPasteContextMenu,
  CopyPasteService,
  DefaultEditorTypeService,
  DefaultPropertyEditorTypesService,
  DefaultInstanceService,
  DefaultModelCommandService,
  DefaultPlacementService,
  DeletionService,
  DesignItemDocumentPositionService,
  DesignItemService,
  DragDropService,
  ElementAtPointService,
  ElementDragTitleExtensionProvider,
  ExtensionType,
  GrayOutDragOverContainerExtensionProvider,
  GrayOutExtensionProvider,
  HighlightElementExtensionProvider,
  IDesignerCanvas,
  ItemsBelowContextMenu,
  MagicWandSelectorTool,
  MultipleItemsSelectedContextMenu,
  NamedTools,
  PanTool,
  PointerTool,
  PointerToolButtonProvider,
  PositionExtensionProvider,
  PreDefinedElementsService,
  PropertyGroupsService,
  RectangleSelectorTool,
  ResizeExtensionProvider,
  SelectionDefaultExtensionProvider,
  SelectionService,
  SelectorToolButtonProvider,
  SeperatorToolProvider,
  ServiceContainer,
  SimpleToolButtonProvider,
  SnaplinesProviderService,
  TransformToolButtonProvider,
  UndoService,
  ZoomTool,
  ZoomToolButtonProvider
} from '@node-projects/web-component-designer';
import { BpmnParserService } from './services/BpmnParserService.js';
import { BpmnContextPadExtensionProvider } from './extensions/BpmnContextPadExtension.js';
import { rerouteConnectedBpmnEdges } from './services/BpmnConnectionRouting.js';
import { associationEndpointTags, collaborationEndpointTags, edgeTags, flowNodeTags } from './services/bpmnRegistry.js';
import { ConnectNodesTool, associationIcon, dataInputAssociationIcon, dataOutputAssociationIcon, messageFlowIcon, sequenceFlowIcon } from './toolbar/ConnectNodesTool.js';
import { BpmnConnectionEditExtensionProvider } from './extensions/BpmnConnectionEditExtension.js';
import { bpmnElements } from './widgets/elements.js';
import './widgets/index.js';

export function createBpmnDesignerServiceContainer() {
  const serviceContainer = new ServiceContainer();
  const parserService = new BpmnParserService();

  serviceContainer.register('instanceService', new DefaultInstanceService());
  serviceContainer.register('containerService', new DefaultPlacementService());
  serviceContainer.register('snaplinesProviderService', new SnaplinesProviderService());
  serviceContainer.register('htmlParserService', parserService);
  serviceContainer.register('htmlWriterService', parserService);
  serviceContainer.register('elementAtPointService', new ElementAtPointService());
  serviceContainer.register('dragDropService', new DragDropService());
  serviceContainer.register('copyPasteService', new CopyPasteService());
  serviceContainer.register('modelCommandService', new DefaultModelCommandService());
  serviceContainer.register('editorTypeService', new DefaultEditorTypeService());
  serviceContainer.register('propertyEditorTypesService', new DefaultPropertyEditorTypesService());
  serviceContainer.register('propertyGroupsService', new PropertyGroupsService());
  serviceContainer.register('propertyService', new BaseCustomWebComponentPropertiesService(true));
  serviceContainer.register('designItemService', new DesignItemService());
  serviceContainer.register('deletionService', new DeletionService());
  serviceContainer.register('elementsService', new PreDefinedElementsService('bpmn', bpmnElements));

  serviceContainer.register('undoService', (designerCanvas: IDesignerCanvas) => new UndoService(designerCanvas));
  serviceContainer.register('selectionService', (designerCanvas: IDesignerCanvas) => new SelectionService(designerCanvas, false));
  serviceContainer.register('designItemDocumentPositionService', (designerCanvas: IDesignerCanvas) => new DesignItemDocumentPositionService(designerCanvas));

  serviceContainer.instanceServiceContainerCreatedCallbacks.push(instanceServiceContainer => {
    const designerCanvas = instanceServiceContainer.designerCanvas;
    const previousRaiseDesignItemsChanged = designerCanvas.raiseDesignItemsChanged.bind(designerCanvas);
    designerCanvas.raiseDesignItemsChanged = (designItems, action, operationFinished) => {
      previousRaiseDesignItemsChanged(designItems, action, operationFinished);
      if (action === 'place' || action === 'resize') {
        rerouteConnectedBpmnEdges(instanceServiceContainer, designItems, operationFinished);
      }
    };
  });

  serviceContainer.designerExtensions.set(ExtensionType.Permanent, []);
  serviceContainer.designerExtensions.set(ExtensionType.PrimarySelection, [
    new ElementDragTitleExtensionProvider(),
    new class extends PositionExtensionProvider {
      override shouldExtend(extensionManager: any, designerView: any, designItem: any) {
        if (edgeTags.has(designItem.element?.localName)) return false;
        return super.shouldExtend(extensionManager, designerView, designItem);
      }
    }(),
    new class extends ResizeExtensionProvider {
      override shouldExtend(extensionManager: any, designerView: any, designItem: any) {
        if (edgeTags.has(designItem.element?.localName)) return false;
        return super.shouldExtend(extensionManager, designerView, designItem);
      }
    }(true),
    new BpmnConnectionEditExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.Selection, [
    new SelectionDefaultExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.OnlyOneItemSelected, [
    new BpmnContextPadExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.PrimarySelectionContainer, []);
  serviceContainer.designerExtensions.set(ExtensionType.MouseOver, [
    new HighlightElementExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.ContainerDrag, [
    new GrayOutExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.ContainerDragOverAndCanBeEntered, [
    new AltToEnterContainerExtensionProvider(),
    new GrayOutDragOverContainerExtensionProvider()
  ]);
  serviceContainer.designerExtensions.set(ExtensionType.ContainerExternalDragOverAndCanBeEntered, [
    new GrayOutDragOverContainerExtensionProvider()
  ]);

  serviceContainer.designerTools.set(NamedTools.Pointer, new PointerTool());
  serviceContainer.designerTools.set(NamedTools.DrawSelection, new RectangleSelectorTool());
  serviceContainer.designerTools.set(NamedTools.Zoom, new ZoomTool());
  serviceContainer.designerTools.set(NamedTools.Pan, new PanTool());
  serviceContainer.designerTools.set(NamedTools.RectangleSelector, new RectangleSelectorTool());
  serviceContainer.designerTools.set(NamedTools.MagicWandSelector, new MagicWandSelectorTool());
  serviceContainer.designerTools.set('BpmnSequenceFlow', new ConnectNodesTool({ tagName: 'bpmn-sequence-flow', allowedTags: flowNodeTags, strokeColor: '#263431' }));
  serviceContainer.designerTools.set('BpmnMessageFlow', new ConnectNodesTool({ tagName: 'bpmn-message-flow', allowedTags: collaborationEndpointTags, strokeColor: '#376d82', strokeDashArray: '10 6' }));
  serviceContainer.designerTools.set('BpmnAssociation', new ConnectNodesTool({ tagName: 'bpmn-association', allowedTags: associationEndpointTags, strokeColor: '#5a6c67', strokeDashArray: '7 5' }));
  serviceContainer.designerTools.set('BpmnDataInputAssociation', new ConnectNodesTool({ tagName: 'bpmn-data-input-association', allowedTags: associationEndpointTags, strokeColor: '#8a5b12', strokeDashArray: '7 5' }));
  serviceContainer.designerTools.set('BpmnDataOutputAssociation', new ConnectNodesTool({ tagName: 'bpmn-data-output-association', allowedTags: associationEndpointTags, strokeColor: '#8a5b12', strokeDashArray: '7 5' }));

  serviceContainer.designerContextMenuExtensions = [
    new CopyPasteContextMenu(),
    new MultipleItemsSelectedContextMenu(),
    new ItemsBelowContextMenu()
  ];

  serviceContainer.designViewToolbarButtons.push(
    new PointerToolButtonProvider(),
    new SeperatorToolProvider(22),
    new SelectorToolButtonProvider(),
    new SeperatorToolProvider(22),
    new SimpleToolButtonProvider('BpmnSequenceFlow', sequenceFlowIcon),
    new SimpleToolButtonProvider('BpmnMessageFlow', messageFlowIcon),
    new SimpleToolButtonProvider('BpmnAssociation', associationIcon),
    new SimpleToolButtonProvider('BpmnDataInputAssociation', dataInputAssociationIcon),
    new SimpleToolButtonProvider('BpmnDataOutputAssociation', dataOutputAssociationIcon),
    new SeperatorToolProvider(22),
    new ZoomToolButtonProvider(),
    new SeperatorToolProvider(22),
    new TransformToolButtonProvider()
  );

  return serviceContainer;
}