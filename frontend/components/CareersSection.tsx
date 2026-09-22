import { useEffect, useState } from 'react';
import { Briefcase, Clock3, MapPin } from 'lucide-react';
import {
  editableValueSchema,
  homeCareersHeaderSchema,
  homeCareersOpenPositionsSchema,
  homeCareersResumeIntroSchema,
  homeEntityDefinitions,
  homeV2SeedData,
  type EditableValue,
  type HomeCareerPosition,
  type HomeCareersHeader,
  type HomeCareersResumeIntro,
  type SemanticEntityDefinition,
} from '@app/schemas';

import { useEditMode } from '../context/editMode.js';
import { CareerApplicationForm } from './CareerApplicationForm.js';
import type { CareerDivision } from './careerApplication.js';
import type { PageId } from '../pages/pageContent.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { EditableBoundary, type EditorOwnership } from './EditableBoundary.js';
import { EditableCollection } from './EditableCollection.js';

type CareersEntityId =
  'home.careers.header' | 'home.careers.open-positions' | 'home.careers.resume-intro';

interface CareersContent {
  readonly header: HomeCareersHeader;
  readonly positions: readonly HomeCareerPosition[];
  readonly resumeIntro: HomeCareersResumeIntro;
}

const divisionByPage: Readonly<Partial<Record<PageId, CareerDivision>>> = {
  'property-management': 'Property Management',
  'real-estate': 'Real Estate',
  construction: 'Construction',
  storage: 'Storage Management',
  development: 'Development',
};

const fallbackContent: CareersContent = {
  header: homeCareersHeaderSchema.parse(homeV2SeedData['home.careers.header']),
  positions: homeCareersOpenPositionsSchema.parse(homeV2SeedData['home.careers.open-positions']),
  resumeIntro: homeCareersResumeIntroSchema.parse(homeV2SeedData['home.careers.resume-intro']),
};

function definitionFor(entityId: CareersEntityId): SemanticEntityDefinition {
  const definition = homeEntityDefinitions.find((candidate) => candidate.id === entityId);
  if (definition === undefined)
    throw new Error(`Careers editor definition missing for ${entityId}`);
  return definition;
}

function ownershipFor(
  entityId: CareersEntityId,
  pending: ReturnType<typeof useEditMode>['pending'],
  currentUserId: string | undefined,
): EditorOwnership {
  const change = pending.find((candidate) => candidate.entityId === entityId);
  if (change === undefined) return 'available';
  return change.authorId === currentUserId ? 'mine' : 'other';
}

function CareerCard({
  position,
  onApply,
}: {
  readonly position: HomeCareerPosition;
  readonly onApply: (position: HomeCareerPosition) => void;
}): React.JSX.Element {
  return (
    <article className="ui-career-card">
      <div>
        <h3 className="type-card-title type-card-title-xs">
          <Briefcase aria-hidden="true" /> {position.title}
        </h3>
        <p>
          <span>
            <MapPin aria-hidden="true" /> {position.division}
          </span>
          <span>
            <Clock3 aria-hidden="true" /> {position.employmentType}
          </span>
        </p>
      </div>
      <button type="button" onClick={() => onApply(position)}>
        Apply Now
      </button>
    </article>
  );
}

export function CareersSection({ pageId }: { readonly pageId: PageId }): React.JSX.Element {
  const editing = useEditMode();
  const [content, setContent] = useState<CareersContent>(fallbackContent);
  const pageDivision = divisionByPage[pageId] ?? '';
  const [applicationDivision, setApplicationDivision] = useState<CareerDivision | ''>(pageDivision);
  const [applicationPosition, setApplicationPosition] = useState('');
  const editable = pageId === 'home';

  useEffect(() => {
    const controller = new AbortController();
    const loader = editable && editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('home', { signal: controller.signal })
      .then((document) => {
        setContent({
          header: homeCareersHeaderSchema.parse(
            document['home.careers.header'] ?? fallbackContent.header,
          ),
          positions: homeCareersOpenPositionsSchema.parse(
            document['home.careers.open-positions'] ?? fallbackContent.positions,
          ),
          resumeIntro: homeCareersResumeIntroSchema.parse(
            document['home.careers.resume-intro'] ?? fallbackContent.resumeIntro,
          ),
        });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          setContent(fallbackContent);
      });
    return () => controller.abort();
  }, [editable, editing.active, editing.disabledEntityIds, editing.pending]);

  useEffect(() => {
    setApplicationDivision(pageDivision);
    setApplicationPosition('');
  }, [pageDivision]);

  const filteredPositions =
    pageDivision === ''
      ? content.positions
      : content.positions.filter((position) => position.division === pageDivision);

  const applyFor = (position: HomeCareerPosition): void => {
    setApplicationDivision(position.division);
    setApplicationPosition(position.title);
    window.requestAnimationFrame(() => {
      document.querySelector('#career-application-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const heading = (
    <header className="ui-section-heading ui-heading-measure-standard">
      <span className="ui-pill ui-pill-blue ui-section-tag">Careers</span>
      <h2 className="type-section-title type-section-title-compact">{content.header.heading}</h2>
      <p className="ui-section-description-standard">{content.header.description}</p>
    </header>
  );
  const resumeHeading = (
    <header className="ui-resume-heading">
      <h3 className="type-card-title type-card-title-lg">{content.resumeIntro.heading}</h3>
      <p className="ui-section-description-standard">{content.resumeIntro.description}</p>
    </header>
  );

  return (
    <section id="careers" className="ui-section ui-careers ui-shared-careers">
      <div className="ui-wide-frame ui-careers-container">
        {editable ? (
          <div className="ui-entity-slot" data-home-entity-boundary="true">
            <EditableBoundary
              active={editing.active}
              definition={definitionFor('home.careers.header')}
              value={editableValueSchema.parse(content.header)}
              ownership={ownershipFor(
                'home.careers.header',
                editing.pending,
                editing.currentUserId,
              )}
              busy={editing.busy}
              onSave={(next) => editing.save('home.careers.header', next)}
              onReloadLatest={() => editing.reload('home.careers.header')}
            >
              {heading}
            </EditableBoundary>
          </div>
        ) : (
          heading
        )}

        {editable ? (
          <div className="ui-entity-slot" data-home-entity-boundary="true">
            <EditableCollection
              active={editing.active}
              definition={definitionFor('home.careers.open-positions')}
              value={content.positions}
              renderItem={(item) => {
                const position = homeCareersOpenPositionsSchema.parse([item])[0];
                if (position === undefined)
                  throw new Error('Career position could not be rendered');
                return <CareerCard position={position} onApply={applyFor} />;
              }}
              ownership={ownershipFor(
                'home.careers.open-positions',
                editing.pending,
                editing.currentUserId,
              )}
              busy={editing.busy}
              onSave={(next: readonly EditableValue[]) =>
                editing.save('home.careers.open-positions', next)
              }
              onReloadLatest={() => editing.reload('home.careers.open-positions')}
            />
          </div>
        ) : filteredPositions.length === 0 ? (
          <p className="ui-careers-empty" role="status">
            No openings are currently listed for {pageDivision}. You can still submit your resume
            for future opportunities.
          </p>
        ) : (
          <div className="ui-careers-list">
            {filteredPositions.map((position) => (
              <CareerCard key={position.id} position={position} onApply={applyFor} />
            ))}
          </div>
        )}

        {editable ? (
          <div className="ui-entity-slot" data-home-entity-boundary="true">
            <EditableBoundary
              active={editing.active}
              definition={definitionFor('home.careers.resume-intro')}
              value={editableValueSchema.parse(content.resumeIntro)}
              ownership={ownershipFor(
                'home.careers.resume-intro',
                editing.pending,
                editing.currentUserId,
              )}
              busy={editing.busy}
              onSave={(next) => editing.save('home.careers.resume-intro', next)}
              onReloadLatest={() => editing.reload('home.careers.resume-intro')}
            >
              {resumeHeading}
            </EditableBoundary>
          </div>
        ) : (
          resumeHeading
        )}
        <div className="ui-form-surface ui-form-surface--inquiry">
          <CareerApplicationForm
            initialDivision={applicationDivision}
            initialPosition={applicationPosition}
          />
        </div>
      </div>
    </section>
  );
}
