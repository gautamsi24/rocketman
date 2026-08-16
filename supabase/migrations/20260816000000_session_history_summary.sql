-- Backs the rolling conversation-history summary (SYSTEM_DESIGN.md §4.A,
-- Tactic C): turns older than the sliding window get compacted into
-- history_summary instead of being resent raw on every turn.
-- history_summary_turn_count tracks how many of the session's turn_events
-- are already folded in, so compaction only does new work once the window
-- actually advances.
alter table sessions add column history_summary text;
alter table sessions add column history_summary_turn_count integer not null default 0;
