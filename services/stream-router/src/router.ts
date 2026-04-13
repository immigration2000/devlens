/**
 * Event routing logic for DevLens
 * Maps raw events to typed topics and ClickHouse tables
 */

import { KAFKA_TOPICS } from '@devlens/shared/constants';

export interface RoutedEvent {
  topic: string;
  table: string;
  isValid: boolean;
  event?: Record<string, any>;
}

/**
 * ClickHouse table mappings
 */
const TABLE_MAPPING: Record<string, string> = {
  code_change: 'code_change_events',
  execution: 'execution_events',
  test_result: 'test_result_events',
  behavior: 'behavior_events',
  structure_change: 'structure_events',
};

/**
 * Topic mappings based on event type
 */
const TOPIC_MAPPING: Record<string, string> = {
  code_change: KAFKA_TOPICS.CODE_CHANGE_EVENTS,
  execution: KAFKA_TOPICS.EXECUTION_EVENTS,
  test_result: KAFKA_TOPICS.TEST_RESULT_EVENTS,
  behavior: KAFKA_TOPICS.BEHAVIOR_EVENTS,
  structure_change: KAFKA_TOPICS.STRUCTURE_EVENTS,
};

/**
 * Route a raw event to appropriate Kafka topic and ClickHouse table
 * @param event Raw event object
 * @returns Routing information or null if invalid
 */
export function routeEvent(event: Record<string, any>): RoutedEvent | null {
  // Validate required fields
  if (!event || typeof event !== 'object') {
    return {
      topic: '',
      table: '',
      isValid: false,
    };
  }

  const eventType = event.event_type || event.event;

  // Validate event has required fields
  if (!eventType || typeof eventType !== 'string') {
    return {
      topic: '',
      table: '',
      isValid: false,
      event,
    };
  }

  if (!event.timestamp) {
    return {
      topic: '',
      table: '',
      isValid: false,
      event,
    };
  }

  if (!event.quest_id && !event.questId) {
    return {
      topic: '',
      table: '',
      isValid: false,
      event,
    };
  }

  // Check if event type is recognized
  const topic = TOPIC_MAPPING[eventType];
  const table = TABLE_MAPPING[eventType];

  if (!topic || !table) {
    return {
      topic: '',
      table: '',
      isValid: false,
      event,
    };
  }

  return {
    topic,
    table,
    isValid: true,
    event,
  };
}

/**
 * Get all recognized event types
 */
export function getRecognizedEventTypes(): string[] {
  return Object.keys(TOPIC_MAPPING);
}

/**
 * Get topic for event type
 */
export function getTopicForEventType(eventType: string): string | null {
  return TOPIC_MAPPING[eventType] || null;
}

/**
 * Get table for event type
 */
export function getTableForEventType(eventType: string): string | null {
  return TABLE_MAPPING[eventType] || null;
}

export default {
  routeEvent,
  getRecognizedEventTypes,
  getTopicForEventType,
  getTableForEventType,
};
