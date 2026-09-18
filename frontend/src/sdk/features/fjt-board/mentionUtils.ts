/**
 * Mention Utilities for FJT Board
 * Provides robust mention extraction and matching across Issue descriptions and comments.
 */

import { FjtIssue } from './types';

export interface MentionUserInfo {
  id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  username?: string;
  initials?: string;
}

/**
 * Extracts all issue text sources where mentions might appear:
 * - issue.description
 * - issue.comments (content of each comment)
 * - rawData / raw_data comments
 */
export function getAllIssueText(issue: FjtIssue): string[] {
  if (!issue) return [];
  const texts: string[] = [];

  if (issue.description && typeof issue.description === 'string') {
    texts.push(issue.description);
  }

  // If issue.comments is an array, it is the active source of truth
  if (Array.isArray(issue.comments)) {
    issue.comments.forEach((c) => {
      if (c && typeof c.content === 'string') {
        texts.push(c.content);
      }
    });
  } else {
    const rawData: any = (issue as any).rawData || (issue as any).raw_data;
    if (rawData) {
      if (Array.isArray(rawData.comments)) {
        rawData.comments.forEach((c: any) => {
          if (c && typeof c.content === 'string') {
            texts.push(c.content);
          }
        });
      } else if (typeof rawData === 'object' && !Array.isArray(rawData)) {
        Object.keys(rawData).forEach((k) => {
          if (/^comment\s*\d+/i.test(k) && typeof rawData[k] === 'string') {
            texts.push(rawData[k]);
          }
        });
      }
    }
  }

  return texts;
}


/**
 * Extracts all @mentions from a text string.
 * Supports @username, @name.surname, @first-last, @name_name, or @[Full Name]
 */
export function extractMentionsFromText(text?: string): string[] {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9_.-]+|\[[^\]]+\])/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[1].replace(/^\[|\]$/g, '').trim();
    if (raw) {
      mentions.push(raw);
    }
  }

  return mentions;
}

/**
 * Checks if an issue has any @mentions in its description or comments.
 */
export function hasAnyMentions(issue: FjtIssue): boolean {
  const texts = getAllIssueText(issue);
  for (const text of texts) {
    if (/@([a-zA-Z0-9_.-]+|\[[^\]]+\])/.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Builds a list of unique searchable match keys for a user.
 */
export function getUserMentionAliases(user: MentionUserInfo | null | undefined): string[] {
  if (!user) return [];
  const aliases = new Set<string>();

  const fullName = (user.full_name || user.name || '').trim().toLowerCase();
  if (fullName) {
    aliases.add(fullName);
    // Add individual word parts of the name (e.g. "chethan", "reddy", "davood", "khan")
    const words = fullName.split(/\s+/).filter((w) => w.length >= 2);
    words.forEach((w) => aliases.add(w));
  }

  const email = (user.email || '').trim().toLowerCase();
  if (email) {
    aliases.add(email);
    const emailPrefix = email.split('@')[0];
    if (emailPrefix) {
      aliases.add(emailPrefix);
      const parts = emailPrefix.split(/[._-]/).filter((p) => p.length >= 2);
      parts.forEach((p) => aliases.add(p));
    }
  }

  const username = (user.username || '').trim().toLowerCase();
  if (username) {
    aliases.add(username);
    const parts = username.split(/[._-]/).filter((p) => p.length >= 2);
    parts.forEach((p) => aliases.add(p));
  }

  return Array.from(aliases);
}

/**
 * Checks if a specific user is mentioned anywhere in the issue's description or comments.
 */
export function doesIssueMentionUser(
  issue: FjtIssue,
  user: MentionUserInfo | null | undefined
): boolean {
  if (!user) return false;
  const texts = getAllIssueText(issue);
  if (texts.length === 0) return false;

  const aliases = getUserMentionAliases(user);
  if (aliases.length === 0) return false;

  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match @alias followed by non-alphanumeric/boundary (e.g. @chethan, @chethan:, @chethan , @chethan-reddy)
      const regex = new RegExp(`@${escaped}(?=[\\s\\n,.!?:;()\\[\\]{}"']|$)`, 'i');
      if (regex.test(lower) || lower.includes(`@${alias}`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns the list of users from a pool of available users that are mentioned in the issue.
 */
export function getMentionedUsersInIssue(
  issue: FjtIssue,
  availableUsers: MentionUserInfo[]
): MentionUserInfo[] {
  if (!availableUsers || availableUsers.length === 0) return [];
  return availableUsers.filter((user) => doesIssueMentionUser(issue, user));
}
