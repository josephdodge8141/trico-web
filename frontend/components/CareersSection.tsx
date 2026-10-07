import { useEffect, useState } from 'react';
import { Briefcase, Clock3, MapPin } from 'lucide-react';
import {
  homeCareersHeaderSchema,
  homeCareersOpenPositionsSchema,
  homeCareersResumeIntroSchema,
  homeEntityDefinitions,
  homeV2SeedData,
  isPubliclyVisible,
  type HomeCareerPosition,
  type HomeCareersHeader,
  type HomeCareersResumeIntro,
  type SemanticEntityDefinition,
} from '@app/schemas';

import { useEditMode } from '../context/editMode.js';
import { Container } from '../design-system/layout.js';
import { CareerApplicationForm } from './CareerApplicationForm.js';
import type { CareerDivision } from './careerApplication.js';
import type { PageId } from '../pages/pageContent.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { ContentCollection, ContentEntity } from './ContentEntity.js';
import { Badge } from './ui/badge.js';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card.js';
import { Button } from './ui/button.js';

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

function CareerCard({
  position,
  onApply,
}: {
  readonly position: HomeCareerPosition;
  readonly onApply: (position: HomeCareerPosition) => void;
}): React.JSX.Element {
  return (
    <Card role="article" className="h-full border border-border/70 shadow-sm">
      <CardHeader>
        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Briefcase className="size-5 text-primary" aria-hidden="true" /> {position.title}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" /> {position.division}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="size-4" aria-hidden="true" /> {position.employmentType}
          </span>
        </p>
      </CardContent>
      <CardFooter>
        <Button type="button" variant="outline" onClick={() => onApply(position)}>
          Apply Now
        </Button>
      </CardFooter>
    </Card>
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

  const publicPositions = editing.active
    ? content.positions
    : content.positions.filter((position) => {
        const seed = homeV2SeedData['home.careers.open-positions'].find(
          (candidate) => candidate.id === position.id,
        );
        const previouslyVisible =
          seed === undefined ||
          (seed.publicVisibility === 'approved' &&
            position.title === seed.title &&
            position.division === seed.division &&
            position.employmentType === seed.employmentType);
        return isPubliclyVisible(position.publicVisibility, previouslyVisible);
      });
  const filteredPositions =
    pageDivision === ''
      ? publicPositions
      : publicPositions.filter((position) => position.division === pageDivision);

  const noOpeningsMessage =
    pageDivision === ''
      ? 'Interested in joining TriCo? Tell us which role you are seeking when you submit your resume.'
      : `Interested in joining TriCo ${pageDivision}? Tell us which role you are seeking when you submit your resume.`;

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
    <header className="mb-10 max-w-3xl space-y-4">
      <Badge variant="secondary">Careers</Badge>
      <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        {content.header.heading}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        {editing.active
          ? content.header.description
          : content.header.description.replace(/all four divisions/gi, 'TriCo divisions')}
      </p>
    </header>
  );
  const resumeHeading = (
    <header className="mb-6 space-y-2">
      <h3 className="font-heading text-xl font-semibold">{content.resumeIntro.heading}</h3>
      <p className="text-sm text-muted-foreground">{content.resumeIntro.description}</p>
    </header>
  );

  return (
    <section id="careers" className="bg-muted/40 py-20 sm:py-24">
      <Container width="wide">
        <div>
          {editable ? (
            <div className="contents" data-home-entity-boundary="true">
              <ContentEntity
                definition={definitionFor('home.careers.header')}
                value={content.header}
              >
                {heading}
              </ContentEntity>
            </div>
          ) : (
            heading
          )}

          <div data-careers-results>
            {editable ? (
              <div
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                data-home-entity-boundary="true"
              >
                <ContentCollection
                  definition={definitionFor('home.careers.open-positions')}
                  value={filteredPositions}
                  renderItem={(item) => {
                    const position = homeCareersOpenPositionsSchema.parse([item])[0];
                    if (position === undefined)
                      throw new Error('Career position could not be rendered');
                    return <CareerCard position={position} onApply={applyFor} />;
                  }}
                />
                {!editing.active && filteredPositions.length === 0 ? (
                  <p
                    className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground"
                    role="status"
                  >
                    {noOpeningsMessage}
                  </p>
                ) : null}
              </div>
            ) : filteredPositions.length === 0 ? (
              <p
                className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground"
                role="status"
              >
                {noOpeningsMessage}
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPositions.map((position) => (
                  <CareerCard key={position.id} position={position} onApply={applyFor} />
                ))}
              </div>
            )}
          </div>

          <div data-careers-resume className="mt-14 border-t border-border/70 pt-10 sm:mt-16">
            {editable ? (
              <div className="contents" data-home-entity-boundary="true">
                <ContentEntity
                  definition={definitionFor('home.careers.resume-intro')}
                  value={content.resumeIntro}
                >
                  {resumeHeading}
                </ContentEntity>
              </div>
            ) : (
              resumeHeading
            )}
          </div>
          <Card className="mt-8 border border-border/70 p-6 shadow-sm">
            <CareerApplicationForm
              initialDivision={applicationDivision}
              initialPosition={applicationPosition}
            />
          </Card>
        </div>
      </Container>
    </section>
  );
}
