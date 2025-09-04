export default function ContactSalesPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Enterprise Solutions
        </h1>
        <p className="text-gray-600 mb-6">
          Contact our sales team to discuss custom pricing and enterprise features.
        </p>
        <a
          href="mailto:sales@kairodx.com"
          className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Contact Sales
        </a>
      </div>
    </div>
  );
}
