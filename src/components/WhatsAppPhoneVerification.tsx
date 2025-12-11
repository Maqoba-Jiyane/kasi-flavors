const WhatsAppPhoneVerification = () => {
  return (
    <div className="w-full">
      <div className="space-y-1 flex-col flex items-center w-full">
        <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Input your WhatsApp code
        </label>
        <input
          name="name"
          required
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          placeholder="Please input the code received from your WhatsApp"
        />
        <button className="bg-emerald-600 text-white px-4 py-2 text-sm font-semibold rounded-full">Verify</button>
      </div>
    </div>
  );
};

export default WhatsAppPhoneVerification;
