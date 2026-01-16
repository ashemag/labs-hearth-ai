import { Paragraph, Subtitle, Title } from "@/components/common/Typography";
import { AnimatedSubLayout } from "@/layouts/AnimatedSubLayout";

export const metadata = {
  title: "On Relational Intelligence",
  description:
    "Hearth AI's thesis on Relational Intelligence - a new category of AI that augments the brain's ability to understand relationships. Your Second Brain for Your People.",
};

// {`Today, our personal and professional networks have reached an unprecedented level of complexity. The last two
//   decades of tech innovation have connected us to more people, across more communication channels, spanning a
//   wider range of contexts, than ever before. Our growing networks have become intractable to manage as
//   individuals - let alone as teams.`}

// <Paragraph className="pt-12 text-brand-purple-darker">
// {`The result is a paralysis around maintaining relationships that leaves us worse off in the modern era. Despite
//   being glued to our screens, we are still struggling to match the right people to the right opportunity at the
//   right time. The status quo places the burden on the user to manage networks that have become unmanageable.`}
// </Paragraph>
//
{
  /* <Paragraph className="pt-12 text-brand-purple-darker">{`Let's get back to what matters: connecting with your people.`}</Paragraph> */
}

// {`A new category is now possible: agentic network management. Agentic products leverage AI agents to learn from,
//   understand, and act on behalf of the user. This means the end of trying to find the right person by searching
//   across spreadsheets and databases. Instead, your agent knows you, your people, and your priorities.`}

const Thesis = () => {
  return (
    <AnimatedSubLayout>
      <Title>On Relational Intelligence</Title>
      <Subtitle>I. The Problem: Modern Networks Have Outpaced Cognitive Ability</Subtitle>
      <Paragraph>
        {`The human brain evolved for tens of thousands of years to navigate localized tribes - not today's modern era of holding millions of touchpoints in our heads across timezones, geographies, and phases of life.`}
        {` We feel overwhelmed, reactive, and disconnected - paralyzed by the complexity of our communities, grasping to manage networks which have become unmanageable.`}
        {` The status quo is broken - we're losing value and we're losing meaning.`}
      </Paragraph>

      <Subtitle className="pt-12">II. Change</Subtitle>
      <Paragraph className="text-brand-purple-darker">
        {`To cope, we've reduced people to categories: coworkers, friends, leads, prospects, candidates. We've pushed relationships through funnels if they're ready to be used, and we've dropped them if not.`}
        {` We've mistaken this for a system - but it's not. It's a mess, and it's the reason "networking" and "CRM" make us cringe.`}
        {` The best founders, sales leaders, investors, and partnership teams know the truth: people are not functional units to squeeze value out of. They're not our leads. They're our humans. And we derive more meaning and make more money when we can find mutuality and matches over longer time horizons.`}
      </Paragraph>

      <Subtitle className="pt-12">III. A New Category: Relational Intelligence</Subtitle>
      <Paragraph className="text-brand-purple-darker">
        {`A new category is now possible: relational intelligence. It is AI that augments the brain's ability to reason on a) who am I, b) who are you, and c) who are you to me, now and over time.`}
        {` We understand ourselves through relation; we're all walking each other home.`}
        {` This is the future of innovation: a radically expanded ability to understand and act on the abundance of who we're connected to and why. The primitive is not the note, the meeting, the organization, the account. It is the person, the relationship.`}
      </Paragraph>

      <Subtitle className="pt-12">IV. Building a Guide</Subtitle>
      <Paragraph className="text-brand-purple-darker">
        {`Each day we take steps on an optimization landscape - a relationscape - of connection.`}
        {` For too long, we've stepped blindly, unable to determine if we are in a local hill or valley, if we're actually moving closer to our relational objectives as individuals, let alone as members of cooperative teams.`}
        {` We're building Hearth to be your guide, `}
        <strong>your relational intelligence for a lifetime.</strong>
      </Paragraph>
      <br />
      <br />
    </AnimatedSubLayout>
  );
};

export default Thesis;
