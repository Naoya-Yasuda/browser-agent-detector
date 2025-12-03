export const runtime = 'edge';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">ページが見つかりません</h1>
        <p className="text-gray-600">お探しのページは存在しないか、移動しました。</p>
      </div>
    </div>
  );
}
