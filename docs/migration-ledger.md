# TriCo migration ledger

This ledger records the immutable inputs and deliberate normalization decisions for the first TriCo content bootstrap. The source ZIP is an input artifact and must not be committed.

## Input provenance

| Input                                            | SHA-256                                                            | Authority                                  |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| `TriCo_Backend_Service_Architecture_REISSUED.md` | `24b10dc63b29c1f7d268d86d031ead212be5650bf0177f9e7b40c883a962450a` | Canonical architecture and entity appendix |
| `trico_entity_registry_regenerated.json`         | `51454694d0c7300ee16430a20bb7ab38894474f7eac7f4c85cfed83f20e4ea8d` | Source-to-entity audit aid                 |
| `Trico Property Portal.zip`                      | `4474f6c4a992e79275636df0cbbf5568b8a6b667a69d9315e7d7ab3c4a11ba67` | Legacy React source and media              |
| `Trico_DynamoDB_Architecture.md`                 | `3cb24a0cb4aae3c47d9a3eba1c8532ed72baca0c7a4c46cfefcedbf13d0c6d38` | Historical guidance only                   |

Template provenance is commit `5cdc4c45e0010038ec742e8d46aa44201d3468f3` from the `fullstack-ts` output. The generated repository is `josephdodge8141/trico-web`; the factory source remains unchanged.

## Registry normalization

- The namespace `landing` becomes `home`; the public route remains `/`.
- The reissued appendix is represented exactly: home 18, property management 35, real estate 31, construction 65, storage 18, and development 28, for 195 editable entities.
- The following form configurations are application code, not CMS entities: `construction.bid.form`, `construction.contact.form`, `development.contact.form`, `home.careers.resume-form`, `property-management.contact.form`, `property-management.new-client-form`, `real-estate.contact.form`, `real-estate.new-client-form`, and `storage.contact.form`.
- Public paths retain the full page namespace. For example, `real-estate.listings.items` is emitted at `real-estate.listings.items`.
- List item IDs derive from the checked-in namespace in `packages/zod/schemas/registry.ts`, the canonical entity ID, and zero-based source position. A rerun therefore produces the same UUID for the same source item.
- Icon component references become validated icon names. Bundled image imports become managed media references. Intentional Unsplash and listing URLs remain external references.

## Deliberate source cleanup

- Real Estate service navigation targets the rendered services section. The unused category dataset and unused Land Experts component are not migrated.
- Storage `#features` navigation targets the rendered storage services/features section.
- Property Management managed-property placeholders `Property 7` through `Property 10` are removed; the seven named source properties remain.
- Empty current and completed construction project arrays remain empty editable lists. Runtime-generated project cards are removed and replaced by an honest empty state.
- Page-scoped review content stays page-scoped even though the legacy React implementation shared a component.
- The five initial external mappings are three MLS listing URLs and two LoopNet listing URLs from the legacy Real Estate listing data. Their item UUIDs must be assigned by deterministic source position during the content extraction pass.

The normalized five-source bootstrap is checked in at `packages/zod/seeds/external-sources.json`. Each source points at the deterministic UUID of its parent listing and carries an explicit validation-field allowlist. The three MLS mappings validate price, status, and MLS number; the two LoopNet mappings validate price, status, and square footage.

## Media disposition

- Bootstrap owns upload of the 51 runtime media files present in the ZIP.
- The 13 `.asset.json` records without image bytes map to one neutral managed placeholder while retaining original filename and asset identifier in migration audit metadata.
- No bootstrap or runtime path automatically deletes media because historical publications may retain references.

The 51 supplied binaries are checked in under `packages/zod/seeds/media/` for deterministic bootstrap without retaining the source ZIP. `packages/zod/seeds/media-inventory.json` records each upload object key, byte size, and SHA-256. It separately records all 13 absent binaries by original filename, Lovable asset ID, content type, original size, and the shared `media/seed/placeholder-neutral.svg` replacement. Placeholder audit metadata is deliberately excluded from public entity JSON.

## Bootstrap safety

- Preflight recomputes all four input hashes, validates every value against its registered schema, checks all 195 IDs and all referenced media, and computes page serialization and transaction action budgets before writing.
- A dry run reports intended entities, sources, media, publications, and manifest paths without mutation.
- An empty environment receives version-1 entities, the five source mappings, six initial publications, immutable release page files, then the manifest as the final switch.
- A rerun with matching checksums and values is a no-op. Existing state with a mismatched checksum or value is rejected; bootstrap never overwrites it implicitly.

## Completed extraction evidence

`packages/zod/seeds/legacy-visible-content.json` contains a schema-valid seed for every canonical ID. The extraction preserves the visible legacy copy, links, phone and email values, ordered collection fields, icon names, and image references. Component imports were normalized to managed object keys, while intentional HTTPS listing imagery remains external. Migration-only provenance fields are not present in entity values.

All list IDs are derived from the checked-in namespace, entity ID, and zero-based source position. The normalized cardinalities include five home divisions, ten combined Real Estate listings, and seven named managed properties. All 16 current/completed construction project collections are intentionally empty and remain editable.

Automated contract coverage verifies all 195 seed keys, source list cardinalities for the cleaned exceptions, deterministic item identity, the absence of migration metadata in public values, the 51/13 media accounting, all five external-source contracts, and a conservative 350 KB serialized ceiling for each initial page snapshot.
