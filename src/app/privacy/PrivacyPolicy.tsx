"use client";
import React from "react";
import { InfoLink, InfoSubTitle, SmallSpacer, Spacer, Text } from "@/components/common/InfoComponents";
import { useRef } from "react";
import { Bullets, Paragraph, Subtitle, Title } from "@/components/common/Typography";

const TableOfContents = [
  { title: "What information do we collect?" },
  { title: "How do we process your information?" },
  { title: "When and with whom do we share your personal information?" },
  { title: "Do we use cookies and other tracking technologies?" },
  { title: "How do we handle your social logins?" },
  { title: "How long do we keep your information?" },
  { title: "How do we keep your information safe?" },
  { title: "Do we collect information from minors?" },
  { title: "What are your privacy rights?" },
  { title: "Controls for do-not-track features?" },
  { title: "Do California residents have specific privacy rights?" },
  { title: "Do we make updates to this notice?" },
  { title: "How can you contact us about this notice?" },
  { title: "How can you review, update, or delete the data we collect from you?" },
  { title: "Google user data" },
];

const PrivacyPolicy = () => {
  const refs = useRef(new Map()).current;

  const scrollToItem = (id: string) => {
    refs.get(id).scrollIntoView({
      behavior: "smooth",
    });
  };
  return (
    <>
      <Title className="pb-4">{`Privacy & Security`}</Title>
      <Subtitle>Revised: November 30, 2023</Subtitle>
      {/* Why we collect your data */}
      <Paragraph>
        {`We collect your data for the purpose of providing you with a high-quality product and user experience.`}
      </Paragraph>

      <Paragraph className="pt-4">
        {`This privacy notice for Hearth AI, Inc. (doing business as Hearth AI)`}
        <strong> {`("Hearth AI," "we," "us," or "our")`}</strong>
        {`, describes how
        and why we might collect, store, use, and/or share ("process") your
        information when you use our services `}
        <strong>{`("Services")`}</strong>
        {`, such as when you:`}
      </Paragraph>

      <Bullets
        bullets={[
          `Visit our website at https://hearth.ai, or any website of ours that
            links to this privacy notice`,
          `Engage with us in other related ways, including any sales, marketing, or events`,
        ]}
      />

      <Subtitle className="pt-8">{`I. What we’re collecting`}</Subtitle>
      <Paragraph>
        {`The information we collect depends on the Hearth features you want to use.
        If you choose to grant access, we can collect personal information such as:`}
      </Paragraph>
      <Bullets
        bullets={[
          `Your email address, when you register for our services or express an interest
           in obtaining information about us or our products and services`,
          `Your calendar events and meetings`,
          `Your contact data`,
        ]}
      />
      <Paragraph className="pt-4">
        {`No information will be collected without your explicit permission,
        which we will ask you for during your onboarding process. We believe
        your integrations provide you with an enriched Hearth experience.`}
      </Paragraph>
      <Paragraph className="pt-4">{`Access to these sets of data allows us to do the following things:`}</Paragraph>
      <Bullets
        bullets={[
          `Provide more accurate briefings on the people you are meeting with`,
          `Provide supplemental context on the people in your network and your most recent
      interactions with them`,
        ]}
      />
      <Subtitle className="pt-8">{`II. No resale of data`}</Subtitle>
      <Paragraph>{`‍Hearth is committed to protecting your privacy, and we will never sell your personal
       information to third parties. We may receive supplemental information from public databases,
       marketing partners, social media platforms, and other outside sources that you have already
       consented to sharing via the privacy settings on those platforms. This information is and
       will solely be used to enhance our services and capabilities.`}</Paragraph>

      <Subtitle className="pt-8">{`III. Deletion of data`}</Subtitle>
      <Paragraph>
        <>
          {`You always have the option to have your data removed from our system.
        If you would like your data to be deleted please reach out to `}
          <a href="mailto:hello@hearth.ai" className="font-bold">
            hello@hearth.ai.
          </a>
        </>
      </Paragraph>

      <Subtitle className="pt-8">{`IV. Your data is safe with us`}</Subtitle>
      <Paragraph>
        {`Your data privacy and security is of the utmost importance to us
        and core to how we operate. We believe AI should augment the human
        experience and that starts with building trust with you by ensuring
        that your data is securely protected. We are committed to safeguarding your data.
        This means we have taken all necessary steps to protect the confidentiality of our users'
        information by implementing rigorous organizational and technical processes and procedures
         as well as additional security measures to ensure the safety of your data. That being said,
          our systems are not magical–we hope that you are accessing our products and services sensibly.`}
      </Paragraph>

      <Spacer />
      <Subtitle>Summary of Key Points</Subtitle>
      <SmallSpacer />
      <Text>
        <>
          This summary provides key points from our privacy notice, but you can find out more details about any of these
          topics by clicking the link following each key point or by using our table of contents below to find the
          section you are looking for. You can also click{" "}
          <a className="underline text-brand-orange" onClick={() => scrollToItem("TOC")}>
            here
          </a>{" "}
          to go directly to our table of contents.
        </>
      </Text>
      <SmallSpacer />
      <Text>
        <strong>What personal information do we process? </strong>
        When you visit, use, or navigate our Services, we may process personal information depending on how you interact
        with Hearth AI and the Services, the choices you make, and the products and features you use. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal
        information.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>Do we receive any information from third parties?</strong> We may receive information from public
        databases, marketing partners, social media platforms, and other outside sources. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>How do we process your information?</strong> We process your information to provide, improve, and
        administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may
        also process your information for other purposes with your consent. We process your information only when we
        have a valid legal reason to do so. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>In what situations and with which parties do we share personal information?</strong> We may share
        information in specific situations and with specific third parties. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>How do we keep your information safe?</strong> We have organizational and technical processes and
        procedures in place to protect your personal information. However, no electronic transmission over the internet
        or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that
        hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and
        improperly collect, access, steal, or modify your information. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy
        law may mean you have certain rights regarding your personal information. Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to learn more.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by filling out our
        data subject request form available here, or by contacting us. We will consider and act upon any request in
        accordance with applicable data protection laws.
      </Text>
      <SmallSpacer />
      <Text>
        <strong>Want to learn more about what Hearth AI does with any information we collect?</strong> Click{" "}
        <a className="underline text-brand-orange" onClick={() => scrollToItem("Section-1")}>
          here
        </a>{" "}
        to review the notice in full.
      </Text>
      <Spacer />
      {/* Table of Contents */}
      <Subtitle>Table of Contents</Subtitle>
      <SmallSpacer />
      <ol ref={(el) => refs.set("TOC", el)} className="list-decimal list-outside pl-6 text-brand-orange leading-8">
        {TableOfContents.map((item, index) => (
          <li key={item.title}>
            <button className="underline" onClick={() => scrollToItem(`Section-${index + 1}`)}>
              {item.title}
            </button>
          </li>
        ))}
      </ol>
      <Spacer />
      {/* Section 1*/}
      <div ref={(el) => refs.set(`Section-1`, el)}>
        <Subtitle>1. What information do we collect?</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>Personal information you disclose to us.</strong>
        </Text>
        <Text>
          <strong>In Short:</strong> We collect personal information that you provide to us
        </Text>
        <SmallSpacer />
        <Text>{`We collect personal information that you voluntarily provide to us
      when you register on the Services, express an interest in obtaining information
      about us or our products and Services, when you participate in activities on the
      Services, or otherwise when you contact us.`}</Text>
        <SmallSpacer />
        <Text>
          <strong>Personal Information Provided by you</strong>{" "}
          {`The personal information that we collect depends on the context
        of your interactions with us and the Services, the choices you make,
         and the products and features you use. The personal information we
         collect may include the following:`}
        </Text>
        <Bullets
          bullets={[
            `names`,
            "phone numbers",
            "email addresses",
            "usernames",
            "passwords",
            "contact or authentication data",
            "debit/credit card numbers",
          ]}
        />
        <p key={"app-integrates"}>
          {`this app integrates with google workspace, with read-only access to calendar, contacts,
          and profile (in compliance with the google api's services`}{" "}
          <InfoLink href="https://developers.google.com/terms/api-services-user-data-policy">{`user data policy`}</InfoLink>
        </p>

        <SmallSpacer />
        <Text>
          <strong>Payment Data.</strong>{" "}
          {`We may collect data necessary to process your payment if you make purchases,
        such as your payment instrument number (such as a credit card number),and the
        security code associated with your payment instrument. All payment data is
        stored by Stripe. You may find their privacy notice link(s) here: `}
          <InfoLink href="https://stripe.com/en-gb-ca/privacy">https://stripe.com/engb-us/privacy</InfoLink>.
        </Text>
        <SmallSpacer />
        <Text>
          <strong>Social Media Login Data. </strong>
          {`We may provide you with the option to
        register with Hearth using your existing social media account details, like your
        Facebook, Twitter, or other social media account. If you choose to register in this way,
        we will collect the information described in the section called "HOW DO WE HANDLE YOUR
        SOCIAL LOGINS?" below.`}
        </Text>
        <SmallSpacer />
        <Text>
          {`All personal information that you provide to us must be true,
        complete, and accurate, and you must notify us of any changes to
        such personal information.`}
        </Text>
        <SmallSpacer />
        <InfoSubTitle>Information Automatically Collected</InfoSubTitle>
        <SmallSpacer />
        <Text>
          <strong>In Short: </strong>
          {`Some information — such as your Internet Protocol (IP)
          address and/or browser and device characteristics — is collected
          automatically when you visit Our Services.`}
        </Text>
        <SmallSpacer />
        <Text>{`We automatically collect certain information when you visit, use,
        or navigate the Services. This information does not reveal your specific
        identity (like your name or contact information) but may include device and
        usage information, such as your IP address, browser and device characteristics,
        operating system, language preferences, referring URLs, device name, country,
        location, information about how and when you use our Services, and other technical
         information. This information is primarily needed to maintain the security and
         operation of our Services, and for our internal analytics and reporting purposes.`}</Text>
        <SmallSpacer />
        <Text>{`Like many businesses, we also collect information through cookies
        and similar technologies.`}</Text>
        <SmallSpacer />
        <Text>{`The information we collect includes:`}</Text>
        <Bullets
          bullets={[
            <span key="point-1">
              <span className="font-bold">Log and Usage Data.</span> Log and usage data is service-related diagnostic,
              usage, and performance information our servers automatically collect when you access or use our Services
              and which we record in log files. Depending on how you interact with us, this log data may include your IP
              address, device information, browser type, and settings and information about your activity in the
              Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and
              other actions you take such as which features you use), device event information (such as system activity,
              error reports (sometimes called &quot;crash dumps&quot;), and hardware settings).
            </span>,
          ]}
        />
        <SmallSpacer />
        <InfoSubTitle>Information collected from other sources</InfoSubTitle>
        <SmallSpacer />
        <Text>
          <strong>In Short: </strong>
          {`We may collect limited data from public databases,
          marketing partners, social media platforms, and other outside sources.`}
        </Text>
        <SmallSpacer />
        <Text>{`In order to enhance our ability to provide relevant marketing, offers,
        and services to you and update our records, we may obtain information about
        you from other sources, such as public databases, joint marketing partners,
        affiliate programs, data providers, social media platforms, and from other third parties.
        This information includes mailing addresses, job titles, email addresses, phone numbers,
        intent data(or user behavior data), Internet Protocol (IP) addresses, social media profiles,
        social media URLs, and custom profiles, for purposes of targeted advertising and event promotion.
        If you interact with us on a social media platform using your social media account (e.g., Facebook
           or Twitter), we receive personal information about you such as your name, email address, and gender.
            Any personal information that we collect from your social media account depends on your social
             media account's privacy settings.`}</Text>
      </div>
      <Spacer />
      {/* Section 2 */}
      <div ref={(el) => refs.set(`Section-2`, el)}>
        <Subtitle>{`2. How do we process your information?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We process your information to provide, improve, and administer our Services,
          communicate with you, for security and fraud prevention, and to comply with law. We may also process your
          information for other purposes with your consent.
        </Text>
        <SmallSpacer />
        <Text>
          <strong>{`We process your personal information for a variety of reasons, depending on how you interact with our Services, including:`}</strong>
        </Text>
        <SmallSpacer />
        <Bullets
          bullets={[
            `To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and login to your account, as well as keep your account in working order.`,
            `To deliver and facilitate delivery of services to the user. We may process your information to provide you with the requested service.`,
            `To respond to user inquiries/offer support to users. We may process your
            information to respond to your inquiries and solve any potential issues you
            might have with the requested service.`,
            `To send administrative information to you. We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.`,
            `To send you marketing and promotional communications. We may
            process the personal information you send to us for our marketing purposes, if
            this is in accordance with your marketing preferences. You can opt out of our
            marketing emails at any time. For more information, see "WHAT ARE YOUR
            PRIVACY RIGHTS?" below).`,
            `To protect our Services. We may process your information as part of our
            efforts to keep our Services safe and secure, including fraud monitoring and
            prevention.`,
            `To evaluate and improve our Services, products, marketing, and your
            experience. We may process your information when we believe it is
            necessary to identify usage trends, determine the effectiveness of our
            promotional campaigns, and to evaluate and improve our Services, products,
            marketing, and your experience.`,
            `To identify usage trends. We may process information about how you use
            our Services to better understand how they are being used so we can improve
            them.`,
            `
            To comply with our legal obligations. We may process your information to
            comply with our legal obligations, respond to legal requests, and exercise,
            establish, or defend our legal rights.`,
          ]}
        />
      </div>
      <Spacer />
      {/* Section 3 */}
      <div ref={(el) => refs.set(`Section-3`, el)}>
        <Subtitle>{`3. When and with whom do we share your personal information.`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We may share information in specific situations described in this section and/or
          with the following third parties.
        </Text>
        <SmallSpacer />
        <Text>{`We may need to share your personal information in the following situations:`}</Text>
        <Bullets
          bullets={[
            "Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.",
            "Vendors, Consultants and Other Third-Party Service Providers. We may share your data with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include: payment processing, data analysis, email delivery, hosting services, customer service and marketing efforts. We may allow selected third parties to use tracking technology on the Services, which will enable them to collect data on our behalf about how you interact with our Services over time. This information may be used to, among other things, analyze and track data, determine the popularity of certain content, pages or features, and better understand online activity.",
          ]}
        />
      </div>
      <Spacer />
      {/* Section 4 */}
      <div ref={(el) => refs.set(`Section-4`, el)}>
        <Subtitle>{`4. Do we use cookies and other tracking technologies?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We may use cookies and other tracking technologies to collect and store your
          information.
        </Text>
        <SmallSpacer />
        <Text>{`We may need to share your personal information in the following situations:`}</Text>
        <SmallSpacer />
        {/* NOTE: The lawyer's recommendation was to link to a our cookie policy here.  */}
        <Text>{`We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.`}</Text>
      </div>
      <Spacer />
      {/* Section 5 */}
      <div ref={(el) => refs.set(`Section-5`, el)}>
        <Subtitle>{`5. How do we handle your social logins?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> If you choose to register or log in to our services using a social media account,
          we may have access to certain information about you.
        </Text>
        <SmallSpacer />
        <Text>{`Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or Twitter logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such asocial media platform.`}</Text>
        <SmallSpacer />
        <Text>{`Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.`}</Text>
      </div>
      <Spacer />
      {/* Section 6 */}
      <div ref={(el) => refs.set(`Section-6`, el)}>
        <Subtitle>{`6. How long do we keep your information?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined
          in this privacy notice unless otherwise required by law
        </Text>
        <SmallSpacer />
        <Text>{`We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements).`}</Text>
        <SmallSpacer />
        <Text>{`When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.`}</Text>
      </div>
      <Spacer />
      {/* Section 7 */}
      <div ref={(el) => refs.set(`Section-7`, el)}>
        <Subtitle>{`7. How do we keep your information safe?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We aim to protect your personal information through a system of organizational and
          technical security measures.
        </Text>
        <SmallSpacer />
        <Text>{`We have implemented reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Transmission of personal information to and from our Services is at your own risk. You should only access theServices within a secure environment.`}</Text>
      </div>
      <Spacer />

      {/* Section 8 */}
      <div ref={(el) => refs.set(`Section-8`, el)}>
        <Subtitle>{`8. Do we collect information from minors?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.
        </Text>
        <SmallSpacer />
        <Text>{`We do not knowingly solicit data from or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at admin@hearth.ai.`}</Text>
      </div>
      <Spacer />

      {/* Section 9 */}
      <div ref={(el) => refs.set(`Section-9`, el)}>
        <Subtitle>{`9. What are your privacy rights?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> You may review, change, or terminate your account at any time.
        </Text>
        <SmallSpacer />
        <Text>
          {`If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority. You can find their contact details `}
          <InfoLink href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm">here</InfoLink>.
          {` If you are located in Switzerland, the contact details for the data protection authorities are available `}
          <InfoLink href="https://www.edoeb.admin.ch/edoeb/en/home.html.`">here</InfoLink>.
        </Text>
        <SmallSpacer />
        <Text>
          {`Withdrawing your consent: If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section `}
          <a className="underline text-brand-orange cursor-pointer" onClick={() => scrollToItem(`Section-13`)}>
            &quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;
          </a>
          {` below.`}
        </Text>
        <SmallSpacer />
        <Text>
          {`However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.`}
        </Text>
        <SmallSpacer />
        <Text>
          {`Opting out of marketing and promotional communications: You can unsubscribe from our marketing and promotional communications at any time by clicking on the unsubscribe link in the emails that we send, or by contacting us using the details provided in the section `}
          <a className="underline text-brand-orange cursor-pointer" onClick={() => scrollToItem(`Section-13`)}>
            &quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;
          </a>
          {` below. You will then be removed from the marketing lists. However, we may still communicate with you — for example, to send you service-related messages that are necessary for the administration and use of your account, to respond to service requests, or for other non-marketing purposes.`}
        </Text>
        <SmallSpacer />
        <Subtitle>Account Information</Subtitle>
        <SmallSpacer />
        <Text>{`If you would at any time like to review or change the information in your account or terminate your account, you can contact us using the contact information provided.`}</Text>
        <SmallSpacer />
        <Text>{`Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.`}</Text>
        <SmallSpacer />
        <Text>
          {`Cookies and similar technologies: Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services. To opt out of interest-based advertising by advertisers on our Services visit `}
          <InfoLink href="http://www.aboutads.info/choices/">{`http://www.aboutads.info/choices/`}</InfoLink>
          {`.`}
        </Text>
        <SmallSpacer />
        <Text>{`If you have questions or comments about your privacy rights, you may email us at admin@hearth.ai.`}</Text>
      </div>
      <Spacer />

      {/* Section 10 */}
      <div ref={(el) => refs.set(`Section-10`, el)}>
        <Subtitle>{`10. Controls for do-not-track features`}</Subtitle>
        <SmallSpacer />
        <Text>{`Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revisedversion of this privacy notice.`}</Text>
      </div>
      <Spacer />

      {/* Section 11 */}
      <div ref={(el) => refs.set(`Section-11`, el)}>
        <Subtitle>{`12. Do California residents have specific privacy rights?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> Yes, if you are a resident of California, you are granted specific rights regarding
          access to your personal information.
        </Text>
        <SmallSpacer />
        <Text>{`California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.`}</Text>
        <SmallSpacer />
        <Text>{`If you are under 18 years of age, reside in California, and have a registered account with a Service, you have the right to request removal of unwanted data that you publicly post on the Services. To request removal of such data, please contact us using the contact information provided below, and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively removed from all our systems (e.g. backups, etc.).`}</Text>
      </div>
      <Spacer />

      {/* Section 12 */}
      <div ref={(el) => refs.set(`Section-12`, el)}>
        <Subtitle>{`13. Do we make updates to this notice?`}</Subtitle>
        <SmallSpacer />
        <Text>
          <strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.
        </Text>
        <SmallSpacer />
        <Text>{`We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.`}</Text>
      </div>
      <Spacer />

      {/* Section 13 */}
      <div ref={(el) => refs.set(`Section-13`, el)}>
        <Subtitle>{`13. How can you contact us about this notice?`}</Subtitle>
        <SmallSpacer />
        <Text>{`If you have questions or comments about this notice, you may email us at admin@hearth.ai or by post to:`}</Text>
        <SmallSpacer />
        <div className="w-[200px]">
          <Text>
            <strong>Hearth AI, Inc.</strong>
          </Text>
          <Text>
            <strong>169 Madison Ave #2212</strong>
          </Text>
          <Text>
            <strong>New York, NY 10016</strong>
          </Text>
        </div>
      </div>
      <Spacer />

      {/* Section 14 */}
      <div ref={(el) => refs.set(`Section-14`, el)}>
        <Subtitle>{`14. How can you review, update, or delete the data we collect from you?`}</Subtitle>
        <SmallSpacer />
        <Text>
          {`Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it. To request to review, update, or delete your personal information, please submit a request form by `}
          <InfoLink href="mailto:admin@hearth.ai">clicking here</InfoLink>
          {`.`}
        </Text>
      </div>
      <Spacer />

      {/* Section 15 */}
      <div ref={(el) => refs.set(`Section-15`, el)}>
        <Subtitle>{`15. Google user data`}</Subtitle>
        <SmallSpacer />
        <Text>{`The Services are integrated with Google Workspace to enhance functionality. We request access to your Google Calendar, Contacts, and Email (optional) data, granted via OAuth permissions. This access allows us to include enriched information in both our daily briefings and interactions with our AI agent. We only request and use the necessary data for these features.`}</Text>
        <SmallSpacer />
        <Text>
          {`We adhere to `}
          <InfoLink
            href={`https://developers.google.com/terms/api-services-user-data-policy`}
          >{`Google API Services User Data Policy`}</InfoLink>{" "}
          {`If we change how we use your Google user data, we will update our Privacy Policy, and we will notify and seek your consent for any new uses of your data.`}
        </Text>
      </div>

      <Paragraph className="pt-8 pb-32">
        <strong>Questions or concerns? </strong>Reading this privacy notice will help you understand your privacy rights
        and choices. If you do not agree with our policies and practices, please do not use our Services. If you still
        have any questions or concerns, please contact us at
        <strong> admin@hearth.ai</strong>.
      </Paragraph>
    </>
  );
};

export default PrivacyPolicy;
