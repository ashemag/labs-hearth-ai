const WavyQuoteBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-[400px]">
      {/* Base outline */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M3,3 
          C20,2 40,4 60,3 
          S80,2 97,3 
          L97,97 
          C80,98 60,96 40,97 
          S20,98 3,97
          Z"
          fill="white"
          stroke="#EAEAED"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Inner solid border */}
      {/* <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M8,8 
          C25,7 45,9 65,8 
          S85,7 92,8 
          L92,92 
          C85,93 65,91 45,92 
          S25,93 8,92
          Z"
          fill="none"
          stroke="#a7715f"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg> */}

      <div className="relative z-10 px-12 py-8">{children}</div>
    </div>
  );
};

export default WavyQuoteBox;
