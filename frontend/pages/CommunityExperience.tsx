import { HandHeart, TreePine, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import anniversaryMark from '../assets/images/trico-40-years-mark.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { PublicHeader } from '../components/PublicHeader.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Container } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';

const homeNavigation = [
  { id: 'community-divisions', label: 'Divisions', destination: 'divisions' },
  { id: 'community-values', label: 'Values', destination: 'values' },
  { id: 'community-journey', label: 'Our story', destination: 'journey' },
  { id: 'community-careers', label: 'Careers', destination: 'careers' },
  { id: 'community-contact', label: 'Contact', destination: 'contact' },
] as const;

const initiatives = [
  {
    title: 'Community donation drive',
    description: 'Supporting local families through a shared effort to give back.',
    icon: HandHeart,
  },
  {
    title: 'Volunteer days',
    description: 'Making time to serve alongside the communities that have supported TriCo.',
    icon: UsersRound,
  },
  {
    title: 'Park beautification',
    description: 'Helping care for the public places our neighbors enjoy together.',
    icon: TreePine,
  },
] as const;

export function CommunityExperience(): React.JSX.Element {
  return (
    <div className="min-w-80 bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to main content
      </a>
      <MarketingLayout
        header={
          <PublicHeader
            logoSrc={tricoLogo}
            logoAltText="TriCo"
            links={homeNavigation}
            actionLabel="Get in touch"
            destinationBase="/"
          />
        }
      >
        <div id="main-content">
          <section className="border-b border-border bg-secondary/35 py-14 sm:py-20">
            <Container
              width="wide"
              className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"
            >
              <div className="max-w-2xl">
                <Badge variant="outline" className="border-primary/25 text-primary">
                  40 years of building community together
                </Badge>
                <h1 className="mt-5 font-heading text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl lg:text-6xl">
                  Giving Back to Our Community
                </h1>
                <p className="mt-5 text-lg font-semibold text-foreground sm:text-xl">
                  Celebrating 40 years of partnership
                </p>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  In honor of TriCo’s 40th anniversary, we are giving back to the communities that
                  have supported us. Join us in supporting local families, volunteering, and making
                  a lasting impact.
                </p>
                <Button render={<Link to="/" />} size="lg" className="mt-8">
                  Explore the TriCo family
                </Button>
              </div>
              <div className="rounded-2xl border-4 border-primary bg-card p-2 shadow-lg ring-2 ring-accent ring-offset-4 ring-offset-secondary/35">
                <img
                  src={anniversaryMark}
                  alt="TriCo 40 years anniversary mark"
                  className="mx-auto aspect-square w-full max-w-md object-contain"
                />
              </div>
            </Container>
          </section>

          <section aria-labelledby="community-ways-title" className="py-16 sm:py-20">
            <Container width="wide">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                  How we give back
                </p>
                <h2
                  id="community-ways-title"
                  className="mt-3 font-heading text-3xl font-bold text-primary sm:text-4xl"
                >
                  Together, we can make a lasting impact.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Our anniversary brings together three ways to care for the people and places
                  around us.
                </p>
              </div>
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {initiatives.map(({ title, description, icon: Icon }) => (
                  <Card key={title} className="border-border/70">
                    <CardHeader>
                      <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <CardTitle className="mt-4 font-heading text-xl">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">{description}</CardContent>
                  </Card>
                ))}
              </div>
            </Container>
          </section>
        </div>
      </MarketingLayout>
      <footer className="border-t border-border bg-background py-8">
        <Container width="wide" className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            TriCo · 40 years of building community together
          </p>
          <Link className="text-sm font-semibold text-primary hover:underline" to="/">
            Back to TriCo
          </Link>
        </Container>
      </footer>
    </div>
  );
}
