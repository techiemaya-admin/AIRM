export default function ActivityLog({
    activity,
  }: any) {
    return (
      <div className="section">
        <h4>Activity</h4>
        {activity.map((a: any, i: number) => (
          <div key={i}>
            {a.field} updated
          </div>
        ))}
      </div>
    );
  }
  