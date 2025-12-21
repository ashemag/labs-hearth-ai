import { AnimatePresence, motion } from "framer-motion";
import { Github, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { useEffect, useState } from "react";

const phrases = [
  "What did I last chat about with Alyssa at Salesforce?",
  "engineers in sf?",
  "Who works at Hearth AI?",
];

const typingSpeed = 20; // ms per character
const deletingSpeed = 25; // ms per character when deleting
const pauseTime = 1200; // ms to pause at full phrase

// Text to stream after everything is done
const fullAnswer =
  "YYou know 5 people at Hearth AI, a company that is building an AI Rolodex to help individuals and teams understand who they're connected to and why.";

const people = [
  {
    name: "Eric Foster",
    email: "eric@hearth.ai",
    title: "Senior Product Design Engineer",
    company: { name: "Hearth", logo: "/brand/logo_square.png" },
    avatar: "/avatars/eric.png",
    common: ["You both went to Stanford."],
    social: [
      { name: "LinkedIn", icon: <Linkedin size={16} strokeWidth={1.5} /> },
      { name: "Twitter", icon: <Twitter size={16} strokeWidth={1.5} /> },
      { name: "GitHub", icon: <Github size={16} strokeWidth={1.5} /> },
    ],
    event: { description: "Ashe/Eric coffee walk", date: "November 11" },
  },
  {
    name: "Brandon Nguyen",
    email: "brandon@hearth.ai",
    title: "Frontend Engineer",
    company: { name: "Hearth", logo: "/brand/logo_square.png" },
    avatar: "/avatars/brandon.png",
    common: ["You've chatted about surfing at Pacifica."],
    social: [
      { name: "LinkedIn", icon: <Linkedin size={16} strokeWidth={1.5} /> },
      { name: "Twitter", icon: <Twitter size={16} strokeWidth={1.5} /> },
    ],
    event: null,
  },
  {
    name: "Topher Brennan",
    email: "topher@hearth.ai",
    title: "Senior Backend Engineer",
    company: { name: "Hearth", logo: "/brand/logo_square.png" },
    avatar: "/avatars/topher.png",
    common: ["You met through Caroline F and have had 3 interviews."],
    social: [
      { name: "LinkedIn", icon: <Linkedin size={16} strokeWidth={1.5} /> },
      { name: "GitHub", icon: <Github size={16} strokeWidth={1.5} /> },
      { name: "Instagram", icon: <Instagram size={16} strokeWidth={1.5} /> },
    ],
    event: { description: "Data sync", date: "November 28" },
  },
  {
    name: "Ashe Magalhaes",
    email: "ashe@hearth.ai",
    title: "Founder & CEO",
    company: { name: "Hearth", logo: "/brand/logo_square.png" },
    avatar: "/avatars/ashe.png",
    social: [
      { name: "LinkedIn", icon: <Linkedin size={16} strokeWidth={1.5} /> },
      { name: "Twitter", icon: <Twitter size={16} strokeWidth={1.5} /> },
      { name: "GitHub", icon: <Github size={16} strokeWidth={1.5} /> },
      { name: "Youtube", icon: <Youtube size={16} strokeWidth={1.5} /> },
      { name: "Youtube", icon: <Youtube size={16} strokeWidth={1.5} /> },
    ],
  },
];

export default function AutoTypingSearch() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFaces, setShowFaces] = useState(false);
  const [hasFinishedAnswer, setHasFinishedAnswer] = useState(false);

  const [displayedAnswer, setDisplayedAnswer] = useState("");

  const currentPhrase = phrases[currentPhraseIndex];
  const isLastPhrase = currentPhraseIndex === phrases.length - 1;

  const [isLastItemHovered, setIsLastItemHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    // @ts-ignore
    let timer;
    if (!isDeleting && displayedText !== currentPhrase) {
      // Typing forward
      timer = setTimeout(() => {
        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
      }, typingSpeed);
    } else if (!isDeleting && displayedText === currentPhrase) {
      if (isLastPhrase) {
        // On the last phrase, pause and show faces
        setIsPaused(true);
        setTimeout(() => setShowFaces(true), 800);
      } else {
        // Pause before deleting for earlier phrases
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else if (isDeleting && displayedText !== "") {
      // Deleting
      timer = setTimeout(() => {
        setDisplayedText(displayedText.slice(0, -1));
      }, deletingSpeed);
    } else if (isDeleting && displayedText === "") {
      // Move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    // @ts-ignore
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, isPaused, currentPhrase, isLastPhrase]);

  // Stream the full answer after final phrase and faces appear
  useEffect(() => {
    if (isPaused && showFaces) {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedAnswer((prev) => prev + fullAnswer.charAt(index));
        index++;
        if (index >= fullAnswer.length) {
          clearInterval(interval);
          setHasFinishedAnswer(true);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isPaused, showFaces]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        width: "100%",
        maxWidth: "1200px",
        margin: "40px auto",
        position: "relative",
        fontFamily: "sans-serif",
      }}
    >
      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Search Input */}
        <div
          style={{
            width: "350px",
            border: "1px solid #e5e7eb",
            borderRadius: "9999px",
            padding: "8px 12px",
            background: "#fff",
            fontSize: "16px",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "40px",
          }}
        >
          <svg
            style={{ flexShrink: 0 }}
            width="16"
            height="16"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <div
            style={{
              whiteSpace: "nowrap",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayedText}
            {!isPaused && (
              <span
                style={{
                  display: "inline-block",
                  width: "1px",
                  background: "#9ca3af",
                  marginLeft: "2px",
                  animation: "blink 1s infinite",
                  verticalAlign: "middle",
                }}
              ></span>
            )}
          </div>
        </div>

        {/* Answer streaming */}
        {isPaused && showFaces && (
          <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
            <div className="mt-1 w-3 h-3 rounded-full animate-pulse" style={{ background: "#a7715f" }} />
            <div
              style={{
                fontSize: "16px",
                color: "#6b7280",
                maxWidth: "250px",
                whiteSpace: "pre-wrap",
              }}
            >
              {displayedAnswer}
            </div>
          </div>
        )}

        {/* Buttons */}
        {isPaused && showFaces && hasFinishedAnswer && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button className="cursor-default bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-all duration-100">
              Set a reminder
            </button>
            <button className="cursor-default bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-all duration-100">
              Add a note
            </button>
            <button className="cursor-default bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-all duration-100">
              Save to collection
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Faces & Info */}
      <div
        style={{
          position: "relative",
          flex: "0 1 700px",
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        <AnimatePresence>
          {showFaces && (
            <>
              {people.map((person, i) => (
                <motion.div
                  key={person.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.1 }}
                  onMouseEnter={() => {
                    if (i === people.length - 1) setIsLastItemHovered(true);
                  }}
                  onMouseLeave={() => {
                    if (i === people.length - 1) setIsLastItemHovered(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    background: "#fff",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease-in-out",
                    filter: i === people.length - 1 && !isLastItemHovered ? "blur(4px)" : "none",
                    opacity: i === people.length - 1 && !isLastItemHovered ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <img
                      src={person.avatar}
                      alt={person.name}
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "600", color: "#374151", fontSize: "16px" }}>{person.name}</span>
                      {person.email && <span style={{ fontSize: "12px", color: "#6b7280" }}>{person.email}</span>}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                          gap: "4px",
                        }}
                      >
                        <span>{person.title}</span>
                        {person.company && (
                          <>
                            <span>•</span>
                            {person.company.logo && (
                              <img
                                src={person.company.logo}
                                alt={person.company.name}
                                style={{ width: "14px", height: "14px", objectFit: "contain" }}
                              />
                            )}
                            <span style={{ color: "#a7715f", fontWeight: "500" }}>{person.company.name}</span>
                          </>
                        )}
                      </div>
                      {person.social && person.social.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "6px",
                          }}
                        >
                          {person.social.slice(0, 5).map((s, idx) => (
                            <span key={idx} style={{ color: "#9ca3af" }}>
                              {s.icon}
                            </span>
                          ))}
                          {person.social.length > 5 && (
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>+ more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      textAlign: "right",
                      gap: "6px",
                      flexShrink: 0,
                      justifyContent: "flex-start",
                    }}
                  >
                    {person.event && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "#F9FAFB",
                          color: "#6b7280",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          gap: "4px",
                        }}
                      >
                        <span>{person.event.description}</span>
                        <span>•</span>
                        <span>{person.event.date}</span>
                      </div>
                    )}
                    {person.common && person.common.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {person.common.map((line, idx) => (
                          <span key={idx} style={{ fontStyle: "italic", fontSize: "12px", color: "#4b5563" }}>
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
