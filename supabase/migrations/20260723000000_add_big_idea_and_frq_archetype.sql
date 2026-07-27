alter table concepts add column if not exists big_idea_code text;
alter table concepts add column if not exists big_idea_label text;

-- Free text, not a subject-specific CHECK enum: the FRQ-archetype taxonomy
-- (like unit_code, content_lo_code, science_practice_code) is specific to
-- the current subject's exam format and must survive onboarding a future
-- subject with a different archetype set without a schema migration.
alter table curriculum_items add column if not exists frq_archetype text;
alter table curriculum_items drop constraint if exists curriculum_items_frq_archetype_check;

-- Provenance flag: distinguishes a verified classification (sourced from an
-- official exam/scoring document, the same bar content_lo_code is held to)
-- from an editorial best-guess -- mirrors bkt_concept_params.source, which
-- makes the same distinction for BKT calibration values.
alter table curriculum_items add column if not exists frq_archetype_source text;
alter table curriculum_items drop constraint if exists curriculum_items_frq_archetype_source_check;
alter table curriculum_items add constraint curriculum_items_frq_archetype_source_check
  check (frq_archetype_source in ('editorial_classification', 'verified'));
