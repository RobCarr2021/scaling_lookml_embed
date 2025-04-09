"use client";

const DashboardOptions = () => {
  const handleCopy = () => {
    // TODO: Implement copy functionality
  };

  return (
    <div
      style={{ position: "absolute", top: 5, right: 5 }}
      className="dashboard-header"
    >
      <button onClick={handleCopy}>Copy Dashboard</button>
    </div>
  );
};

export default DashboardOptions;
