import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { slideshowApi } from '../services/api';

const inputCls =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]/30';
const btnPrimary =
  'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white bg-[#003580] hover:bg-[#002a66] disabled:opacity-50 transition-colors';
const btnGhost =
  'inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50';
const btnDanger =
  'inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50';

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function Slideshow() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [newCaption, setNewCaption] = useState('');
  const [newOrder, setNewOrder] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type }), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await slideshowApi.list();
      const list = normalizeList(data).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setItems(list);
      const d = {};
      list.forEach(row => {
        d[row.id] = {
          caption: row.caption ?? '',
          order: row.order ?? 0,
        };
      });
      setDrafts(d);
    } catch (e) {
      console.error(e);
      showToast('Could not load slideshow images.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) {
      showToast('Choose an image file first.', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', newCaption);
      fd.append('order', String(newOrder));
      await slideshowApi.upload(fd);
      setFile(null);
      setNewCaption('');
      setNewOrder(0);
      showToast('Image uploaded.');
      await load();
    } catch (err) {
      const msg =
        err?.detail ||
        err?.image?.[0] ||
        (typeof err === 'object' ? JSON.stringify(err) : String(err));
      showToast(msg || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const patchRow = async (id, body) => {
    setSavingId(id);
    try {
      await slideshowApi.update(id, body);
      showToast('Saved.');
      await load();
    } catch (err) {
      showToast(err?.detail || 'Save failed.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async row => {
    await patchRow(row.id, { is_active: !row.is_active });
  };

  const saveEdits = async row => {
    const d = drafts[row.id];
    if (!d) return;
    await patchRow(row.id, {
      caption: d.caption,
      order: Number(d.order) || 0,
    });
  };

  const remove = async row => {
    if (!window.confirm('Delete this image from the login slideshow?')) return;
    setDeletingId(row.id);
    try {
      await slideshowApi.delete(row.id);
      showToast('Deleted.');
      await load();
    } catch {
      showToast('Delete failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const updateDraft = (id, field, value) => {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Login slideshow</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Images you add here rotate on the <strong>sign-in</strong> page background. Only slides marked{' '}
            <em>active</em> are shown to visitors. Drag order is controlled by the <em>order</em> number (lower
            appears first).
          </p>
        </div>

        {toast.msg && (
          <div
            className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
            }`}
          >
            {toast.msg}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Add image</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Image file</label>
              <input
                type="file"
                accept="image/*"
                className={inputCls}
                onChange={ev => setFile(ev.target.files?.[0] || null)}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1">Caption (optional)</label>
              <input
                className={inputCls}
                value={newCaption}
                onChange={e => setNewCaption(e.target.value)}
                placeholder="Short label"
              />
            </div>
            <div className="w-full md:w-24">
              <label className="block text-xs font-medium text-slate-500 mb-1">Order</label>
              <input
                type="number"
                className={inputCls}
                value={newOrder}
                onChange={e => setNewOrder(Number(e.target.value))}
              />
            </div>
            <button type="submit" className={btnPrimary} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Current slides ({items.length})
          </h2>

          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 text-sm">
              No images yet. Upload one above — they will appear on the login page when marked active.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(row => {
                const draft = drafts[row.id] || { caption: row.caption ?? '', order: row.order ?? 0 };
                const url = row.image_url || '';
                return (
                  <article
                    key={row.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="aspect-video bg-slate-100 relative">
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">No preview</div>
                      )}
                      <span
                        className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-md ${
                          row.is_active ? 'bg-green-600 text-white' : 'bg-slate-600/90 text-white'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Caption</label>
                        <input
                          className={inputCls}
                          value={draft.caption}
                          onChange={e => updateDraft(row.id, 'caption', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3 items-end">
                        <div className="w-24">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Order</label>
                          <input
                            type="number"
                            className={inputCls}
                            value={draft.order}
                            onChange={e => updateDraft(row.id, 'order', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={savingId === row.id}
                          onClick={() => saveEdits(row)}
                        >
                          {savingId === row.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 mt-auto border-t border-slate-100">
                        <button type="button" className={btnGhost} onClick={() => toggleActive(row)}>
                          {row.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          disabled={deletingId === row.id}
                          onClick={() => remove(row)}
                        >
                          {deletingId === row.id ? '…' : 'Delete'}
                        </button>
                      </div>
                      {row.uploaded_at && (
                        <p className="text-xs text-slate-400">Uploaded {new Date(row.uploaded_at).toLocaleString()}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
