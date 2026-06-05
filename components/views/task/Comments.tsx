export default function Comments({
    comments,
    onAdd,
  }: any) {
    return (
      <div className="comments">
        <textarea
          placeholder="Add a comment"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
        />
        {comments.length === 0 && (
          <p>No comments</p>
        )}
      </div>
    );
  }
  