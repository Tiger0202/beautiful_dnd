// @flow
import { offset, type Position, type BoxModel } from 'css-box-model';
import { vertical, horizontal } from '../../../../../src/state/axis';
import { getPreset, makeScrollable } from '../../../../utils/dimension';
import type {
  Axis,
  DisplacedBy,
  Displacement,
  DragImpact,
  DraggableDimension,
  DroppableDimension,
  DimensionMap,
  Viewport,
} from '../../../../../src/types';
import getOffsetFromStart from '../../../../../src/state/middleware/drop/get-new-home-client-offset';
import noImpact from '../../../../../src/state/no-impact';
import getHomeImpact from '../../../../../src/state/get-home-impact';
import {
  origin,
  subtract,
  negate,
  add,
} from '../../../../../src/state/position';
import getDisplacedBy from '../../../../../src/state/get-displaced-by';
import getDisplacementMap from '../../../../../src/state/get-displacement-map';
import {
  goAfter,
  goBefore,
  goIntoStart,
} from '../../../../../src/state/move-relative-to';
import {
  forward,
  backward,
} from '../../../../../src/state/user-direction/user-direction-preset';
import scrollDroppable from '../../../../../src/state/droppable/scroll-droppable';
import scrollViewport from '../../../../../src/state/scroll-viewport';

const getDisplacement = (draggable: DraggableDimension): Displacement => ({
  isVisible: true,
  shouldAnimate: true,
  draggableId: draggable.descriptor.id,
});

[vertical, horizontal].forEach((axis: Axis) => {
  describe(`dropping on ${axis.direction} list`, () => {
    const preset = getPreset(axis);

    it('should return home position when not over anything', () => {
      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: noImpact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      expect(result).toEqual(origin);
    });

    it('should return home position over home location', () => {
      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: getHomeImpact(preset.inHome1, preset.home),
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      expect(result).toEqual(origin);
    });

    it('should drop in front of the closest backwards displaced item', () => {
      // inHome1 moving forward past inHome2 and inHome3
      const willDisplaceForward: boolean = false;
      // ordered by closest impacted
      const displaced: Displacement[] = [
        getDisplacement(preset.inHome3),
        getDisplacement(preset.inHome2),
      ];
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: {
          index: preset.inHome3.descriptor.index,
          droppableId: preset.home.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInHome3: BoxModel = offset(
        preset.inHome3.client,
        displacedBy.point,
      );
      const expectedCenter: Position = goAfter({
        axis,
        moveRelativeTo: displacedInHome3,
        isMoving: preset.inHome1.client,
      });
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop in behind of the closest forwards displaced item', () => {
      // inHome3 moving backward past inHome1 and inHome2
      const willDisplaceForward: boolean = true;
      // ordered by closest impacted
      const displaced: Displacement[] = [
        getDisplacement(preset.inHome1),
        getDisplacement(preset.inHome2),
      ];
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome3.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        // moving into the first position
        destination: {
          index: 0,
          droppableId: preset.home.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome3,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInHome1: BoxModel = offset(
        preset.inHome1.client,
        displacedBy.point,
      );
      const expectedCenter: Position = goBefore({
        axis,
        moveRelativeTo: displacedInHome1,
        isMoving: preset.inHome3.client,
      });
      const original: Position = preset.inHome3.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop after the last item in a list if nothing is displaced', () => {
      // inHome1 over the end of foreign
      const willDisplaceForward: boolean = true;
      const displaced: Displacement[] = [];
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        // moving into the last position
        destination: {
          index: preset.inForeignList.length - 1,
          droppableId: preset.foreign.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const expectedCenter: Position = goAfter({
        axis,
        moveRelativeTo: preset.inForeign4.client,
        isMoving: preset.inHome1.client,
      });
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop into the start of an empty list', () => {
      // inHome1 over the end of empty
      const willDisplaceForward: boolean = true;
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced: [],
          map: {},
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        // moving into the last position
        destination: {
          index: 0,
          droppableId: preset.emptyForeign.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const expectedCenter: Position = goIntoStart({
        axis,
        moveInto: preset.emptyForeign.client,
        isMoving: preset.inHome1.client,
      });
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop into the center of an item that is being combined with', () => {
      // inHome1 combining with inHome2
      const willDisplaceForward: boolean = true;
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced: [],
          map: {},
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: null,
        merge: {
          whenEntered: forward,
          combine: {
            draggableId: preset.inHome2.descriptor.id,
            droppableId: preset.home.descriptor.id,
          },
        },
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const expectedCenter: Position = preset.inHome2.client.borderBox.center;
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop into the center of a forward displaced combined item', () => {
      // inHome1 combining with displaced inForeign1
      // displacing forward in foreign list
      const willDisplaceForward: boolean = true;
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      // displaced inForeign1 forward
      const displaced: Displacement[] = [getDisplacement(preset.inForeign1)];
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: null,
        merge: {
          whenEntered: forward,
          combine: {
            draggableId: preset.inForeign1.descriptor.id,
            droppableId: preset.home.descriptor.id,
          },
        },
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInForeign1: BoxModel = offset(
        preset.inForeign1.client,
        displacedBy.point,
      );
      const expectedCenter: Position = displacedInForeign1.borderBox.center;
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop into the center of a backwards displaced combined item', () => {
      // inHome2 combining with displaced inHome3
      // Would have dragged forwards and now dragging backwards
      // displacing backwards in home list
      const willDisplaceForward: boolean = false;
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome2.displaceBy,
        willDisplaceForward,
      );
      // displaced inForeign1 forward
      const displaced: Displacement[] = [getDisplacement(preset.inHome3)];
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: null,
        merge: {
          whenEntered: backward,
          combine: {
            draggableId: preset.inHome3.descriptor.id,
            droppableId: preset.home.descriptor.id,
          },
        },
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome2,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInHome3: BoxModel = offset(
        preset.inHome3.client,
        displacedBy.point,
      );
      const expectedCenter: Position = displacedInHome3.borderBox.center;
      const original: Position = preset.inHome2.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should account for the scroll of the droppable you are over when reordering', () => {
      const scrollableHome: DroppableDimension = makeScrollable(preset.home);
      const scroll: Position = { x: 10, y: 15 };
      const displacement: Position = negate(scroll);
      const scrolled: DroppableDimension = scrollDroppable(
        scrollableHome,
        scroll,
      );
      const withScrolled: DimensionMap = {
        ...preset.dimensions,
        droppables: {
          ...preset.droppables,
          [scrolled.descriptor.id]: scrolled,
        },
      };
      const impact: DragImpact = getHomeImpact(preset.inHome1, preset.home);

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: withScrolled,
        viewport: preset.viewport,
      });

      expect(result).toEqual(displacement);
    });

    it('should account for the scroll of the droppable you are over when combining', () => {
      const scrollableHome: DroppableDimension = makeScrollable(preset.home);
      const scroll: Position = { x: 10, y: 15 };
      const displacement: Position = negate(scroll);
      const scrolled: DroppableDimension = scrollDroppable(
        scrollableHome,
        scroll,
      );
      const withScrolled: DimensionMap = {
        ...preset.dimensions,
        droppables: {
          ...preset.droppables,
          [scrolled.descriptor.id]: scrolled,
        },
      };
      // inHome1 combining with inHome2
      const willDisplaceForward: boolean = false;
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced: [],
          map: {},
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: null,
        merge: {
          whenEntered: forward,
          combine: {
            draggableId: preset.inHome2.descriptor.id,
            droppableId: preset.home.descriptor.id,
          },
        },
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: withScrolled,
        viewport: preset.viewport,
      });

      const expectedCenter: Position = preset.inHome2.client.borderBox.center;
      const original: Position = preset.inHome1.client.borderBox.center;
      const centerDiff: Position = subtract(expectedCenter, original);
      const expectedOffset: Position = add(centerDiff, displacement);
      expect(result).toEqual(expectedOffset);
    });

    it('should account for the scroll of your home list if you are not over any list', () => {
      const scrollableHome: DroppableDimension = makeScrollable(preset.home);
      const scroll: Position = { x: 10, y: 15 };
      const displacement: Position = negate(scroll);
      const scrolled: DroppableDimension = scrollDroppable(
        scrollableHome,
        scroll,
      );
      const withScrolled: DimensionMap = {
        ...preset.dimensions,
        droppables: {
          ...preset.droppables,
          [scrolled.descriptor.id]: scrolled,
        },
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: noImpact,
        draggable: preset.inHome1,
        dimensions: withScrolled,
        viewport: preset.viewport,
      });

      expect(result).toEqual(displacement);
    });

    it('should account for any changes in the window scroll', () => {
      const scroll: Position = { x: 10, y: 15 };
      const displacement: Position = negate(scroll);
      const scrolled: Viewport = scrollViewport(
        preset.viewport,
        // adding to the existing scroll
        add(preset.windowScroll, scroll),
      );

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: noImpact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: scrolled,
      });

      expect(result).toEqual(displacement);
    });
  });
});
