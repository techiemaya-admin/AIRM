/**
 * Relationship Hierarchy Utilities for FJT Board
 * Handles Epic -> Story -> Bug / Task relationship traversal and filtering.
 */

import { FjtEpic, FjtIssue } from './types';

/**
 * Builds an O(1) lookup map of issues by both ID and Key.
 */
export function buildIssuesMap(issues?: FjtIssue[] | null): Map<string, FjtIssue> {
  const map = new Map<string, FjtIssue>();
  if (!Array.isArray(issues)) return map;

  for (const issue of issues) {
    if (issue) {
      if (issue.id) map.set(String(issue.id), issue);
      if (issue.key) map.set(String(issue.key), issue);
    }
  }
  return map;
}

/**
 * Checks whether an issue belongs to a given Epic through the relationship hierarchy:
 * 1. Direct Epic association on the issue (issue.epicId or issue.epicKey)
 * 2. Through parent Story (issue.storyId or issue.storyKey -> parentStory.epicId/epicKey)
 * 3. Through linked Task (issue.linkedTaskId or issue.linkedTaskKey -> linkedTask.epicId/epicKey or linkedTask's parentStory)
 * 4. Traverses full ancestor chain with cycle protection.
 */
export function isIssueLinkedToEpic(
  issue?: FjtIssue | null,
  targetEpicId?: string | null,
  issuesMap?: Map<string, FjtIssue> | null,
  epics?: FjtEpic[] | null
): boolean {
  if (!issue) return false;
  if (!targetEpicId || targetEpicId === 'all') return true;

  const epicsList = Array.isArray(epics) ? epics : [];
  const map = issuesMap instanceof Map ? issuesMap : new Map<string, FjtIssue>();

  const targetEpic = epicsList.find((e) => e && (e.id === targetEpicId || e.key === targetEpicId));
  const targetKeys = new Set<string>();
  targetKeys.add(String(targetEpicId));
  if (targetEpic?.id) targetKeys.add(String(targetEpic.id));
  if (targetEpic?.key) targetKeys.add(String(targetEpic.key));

  const visited = new Set<string>();
  let current: FjtIssue | undefined = issue;

  while (current) {
    const currentIdentifier = current.id || current.key;
    if (currentIdentifier) {
      if (visited.has(currentIdentifier)) break;
      visited.add(currentIdentifier);
    }

    // 1. Direct epic match on current issue
    if (
      (current.epicId && targetKeys.has(String(current.epicId))) ||
      (current.epicKey && targetKeys.has(String(current.epicKey)))
    ) {
      return true;
    }

    // 2. Check parent story
    const parentStory =
      (current.storyId && map.get(String(current.storyId))) ||
      (current.storyKey && map.get(String(current.storyKey)));

    if (parentStory) {
      const parentId = parentStory.id || parentStory.key;
      if (!parentId || !visited.has(parentId)) {
        if (
          (parentStory.epicId && targetKeys.has(String(parentStory.epicId))) ||
          (parentStory.epicKey && targetKeys.has(String(parentStory.epicKey)))
        ) {
          return true;
        }
      }
    }

    // 3. Check linked task
    const linkedTask =
      (current.linkedTaskId && map.get(String(current.linkedTaskId))) ||
      (current.linkedTaskKey && map.get(String(current.linkedTaskKey)));

    if (linkedTask) {
      const taskId = linkedTask.id || linkedTask.key;
      if (!taskId || !visited.has(taskId)) {
        if (
          (linkedTask.epicId && targetKeys.has(String(linkedTask.epicId))) ||
          (linkedTask.epicKey && targetKeys.has(String(linkedTask.epicKey)))
        ) {
          return true;
        }

        const taskParentStory =
          (linkedTask.storyId && map.get(String(linkedTask.storyId))) ||
          (linkedTask.storyKey && map.get(String(linkedTask.storyKey)));

        if (taskParentStory) {
          const taskStoryId = taskParentStory.id || taskParentStory.key;
          if (!taskStoryId || !visited.has(taskStoryId)) {
            if (
              (taskParentStory.epicId && targetKeys.has(String(taskParentStory.epicId))) ||
              (taskParentStory.epicKey && targetKeys.has(String(taskParentStory.epicKey)))
            ) {
              return true;
            }
          }
        }
      }
    }

    // Advance up hierarchy
    current = parentStory || linkedTask;
    if (current && currentIdentifier && (current.id || current.key) === currentIdentifier) {
      break;
    }
  }

  return false;
}

/**
 * Checks whether an issue is completely unassociated with any Epic.
 */
export function isIssueWithoutEpic(
  issue?: FjtIssue | null,
  issuesMap?: Map<string, FjtIssue> | null
): boolean {
  if (!issue) return true;

  const map = issuesMap instanceof Map ? issuesMap : new Map<string, FjtIssue>();
  const visited = new Set<string>();
  let current: FjtIssue | undefined = issue;

  while (current) {
    const currentIdentifier = current.id || current.key;
    if (currentIdentifier) {
      if (visited.has(currentIdentifier)) break;
      visited.add(currentIdentifier);
    }

    if (current.epicId || current.epicKey) {
      return false;
    }

    const parentStory =
      (current.storyId && map.get(String(current.storyId))) ||
      (current.storyKey && map.get(String(current.storyKey)));

    if (parentStory && (parentStory.epicId || parentStory.epicKey)) {
      return false;
    }

    const linkedTask =
      (current.linkedTaskId && map.get(String(current.linkedTaskId))) ||
      (current.linkedTaskKey && map.get(String(current.linkedTaskKey)));

    if (linkedTask) {
      if (linkedTask.epicId || linkedTask.epicKey) {
        return false;
      }
      const taskParentStory =
        (linkedTask.storyId && map.get(String(linkedTask.storyId))) ||
        (linkedTask.storyKey && map.get(String(linkedTask.storyKey)));

      if (taskParentStory && (taskParentStory.epicId || taskParentStory.epicKey)) {
        return false;
      }
    }

    current = parentStory || linkedTask;
    if (current && currentIdentifier && (current.id || current.key) === currentIdentifier) {
      break;
    }
  }

  return true;
}

/**
 * Checks whether an issue is linked to a Story.
 */
export function isIssueLinkedToStory(
  issue?: FjtIssue | null,
  targetStoryId?: string | null,
  issuesMap?: Map<string, FjtIssue> | null
): boolean {
  if (!issue) return false;
  if (!targetStoryId || targetStoryId === 'all') return true;

  const map = issuesMap instanceof Map ? issuesMap : new Map<string, FjtIssue>();
  const target = String(targetStoryId);

  if (issue.id === target || issue.key === target) return true;
  if (issue.storyId === target || issue.storyKey === target) return true;

  const linkedTask =
    (issue.linkedTaskId && map.get(String(issue.linkedTaskId))) ||
    (issue.linkedTaskKey && map.get(String(issue.linkedTaskKey)));

  if (linkedTask) {
    if (linkedTask.id === target || linkedTask.key === target) return true;
    if (linkedTask.storyId === target || linkedTask.storyKey === target) return true;
  }

  return false;
}
