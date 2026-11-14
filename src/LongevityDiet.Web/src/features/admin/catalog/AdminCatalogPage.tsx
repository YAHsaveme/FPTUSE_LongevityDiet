import { useMemo, useState } from 'react'
import './admin-pagination.css'
import { viContent } from '../../../lib/viContent'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Leaf, Plus, Save, Trash2, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/apiError'
import {
  createFood,
  createRecipe,
  createRule,
  createRuleVersion,
  deactivateFood,
  deactivateRecipe,
  getAdminRecipe,
  getAllergens,
  getFoods,
  getRecipes,
  getRules,
  transitionRuleVersion,
  getRuleHistory,
  getRuleImpact,
  getRuleReviewQueue,
  type RuleVersion,
  updateFood,
  updateRecipe,
  type Food,
  type RecipeDetail,
  type SaveFoodInput,
  type SaveRecipeInput,
} from '../../catalog/catalogApi'

type AdminTab = 'foods' | 'recipes' | 'rules'

const emptyFood: SaveFoodInput = {
  name: '', category: '', tags: '', cuisine: '',
  defaultServingAmount: 100, servingUnit: 'g',
  calories: 0, proteinG: 0, carbohydrateG: 0, fatG: 0,
  saturatedFatG: 0, sugarG: 0, fiberG: 0,
  isPlantBased: false, isLegume: false, isWholeGrain: false, isFish: false,
}

const emptyRecipe: SaveRecipeInput = {
  name: '',
  description: '',
  category: '',
  cuisine: '',
  tags: '',
  servingCount: 1,
  prepMinutes: 0,
  caloriesPerServing: 0,
  proteinGPerServing: 0,
  carbohydrateGPerServing: 0,
  fatGPerServing: 0,
  saturatedFatGPerServing: 0,
  sugarGPerServing: 0,
  fiberGPerServing: 0,
  isPlantForward: false,
  hasLegume: false,
  hasWholeGrain: false,
  hasFish: false,
  ingredients: [],
  allergenIds: [],
}

export function AdminCatalogPage() {
  const [tab, setTab] = useState<AdminTab>('foods')
  return (
    <div className="catalog-page admin-catalog-page">
      <header className="catalog-topbar">
        <Link className="brand" to="/catalog">
          <span className="brand-monogram">L</span>
          <span className="brand-copy"><strong>Longevity</strong><small>Quản lý danh mục</small></span>
        </Link>
        <nav className="catalog-nav">
          <Link to="/app">Hôm nay</Link>
          <Link to="/catalog">Danh mục</Link>
          <Link className="active" to="/admin/catalog">Quản trị</Link>
          <Link to="/profile">Hồ sơ</Link>
        </nav>
      </header>
      <main className="catalog-main">
        <section className="catalog-hero admin-hero">
          <div>
            <span className="eyebrow">QUẢN TRỊ · DANH MỤC VÀ QUY TẮC</span>
            <h1>Quản lý dữ liệu thật, có phiên bản và có nguồn.</h1>
            <p>Ngừng sử dụng mục sẽ không xóa lịch sử. Phiên bản quy tắc đã xuất bản không được sửa đổi; tất cả thay đổi được xử lý và ghi nhận tại máy chủ.</p>
          </div>
        </section>
        <section className="catalog-workspace">
          <div className="catalog-tabs admin-tabs">
            <button className={tab === 'foods' ? 'active' : ''} onClick={() => setTab('foods')}><Leaf size={15} /> Thực phẩm</button>
            <button className={tab === 'recipes' ? 'active' : ''} onClick={() => setTab('recipes')}><Utensils size={15} /> Công thức</button>
            <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}><BookOpen size={15} /> Quy tắc</button>
          </div>
          {tab === 'foods' && <FoodAdmin />}
          {tab === 'recipes' && <RecipeAdmin />}
          {tab === 'rules' && <RuleAdmin />}
        </section>
      </main>
    </div>
  )
}

function FoodAdmin() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SaveFoodInput>(emptyFood)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const foods = useQuery({
    queryKey: ['admin', 'foods', page, search],
    queryFn: () => getFoods({ page, pageSize: 20, search: search.trim() || undefined, sortBy: 'name' }, true),
  })
  const save = useMutation({
    mutationFn: () => editingId ? updateFood(editingId, form) : createFood(form),
    onSuccess: () => {
      setMessage(editingId ? 'Đã cập nhật thực phẩm.' : 'Đã thêm thực phẩm.')
      setEditingId(null)
      setForm(emptyFood)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'foods'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'foods'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })
  const deactivate = useMutation({
    mutationFn: deactivateFood,
    onSuccess: () => {
      setMessage('Đã ngừng sử dụng thực phẩm; lịch sử được giữ lại.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'foods'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'foods'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })
  const edit = (food: Food) => {
    setEditingId(food.id)
    setForm({
      name: food.name, category: food.category, tags: food.tags ?? '', cuisine: food.cuisine ?? '',
      defaultServingAmount: food.defaultServingAmount, servingUnit: food.servingUnit,
      calories: food.calories, proteinG: food.proteinG, carbohydrateG: food.carbohydrateG, fatG: food.fatG,
      saturatedFatG: food.saturatedFatG ?? 0, sugarG: food.sugarG ?? 0, fiberG: food.fiberG ?? 0,
      isPlantBased: food.isPlantBased, isLegume: food.isLegume, isWholeGrain: food.isWholeGrain, isFish: food.isFish,
    })
    setMessage(null)
  }

  return (
    <div className="admin-grid">
      <section className="admin-list-panel">
        <PanelHeading title="Nguyên liệu / thực phẩm" note={String(foods.data?.totalItems ?? 0) + ' mục, bao gồm mục ngừng hoạt động'} />
        <label className="admin-field"><span>Tìm nguyên liệu</span><input value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder="Tìm bằng tên nguyên liệu..." /></label>
        {foods.isLoading && <AdminState>Đang tải thực phẩm...</AdminState>}
        {foods.isError && <AdminState error>Không thể tải thực phẩm.</AdminState>}
        <div className="admin-item-list">
          {foods.data?.items.map((food) => (
            <div className={food.isActive ? 'admin-item' : 'admin-item inactive'} key={food.id}>
              <div><strong>{viContent(food.name)}</strong><span>{viContent(food.category)} · {food.calories} kcal · {food.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></div>
              <div className="admin-item-actions">
                <button onClick={() => edit(food)}>Sửa</button>
                {food.isActive && <button className="danger" onClick={() => deactivate.mutate(food.id)}><Trash2 size={13} /> Ngừng sử dụng</button>}
              </div>
            </div>
          ))}
        </div>
        {foods.data && foods.data.totalPages > 1 && (
          <div className="admin-page-navigation" aria-label="Phân trang nguyên liệu">
            <button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Trang trước</button>
            <span>Trang {page}/{foods.data.totalPages}</span>
            <button type="button" disabled={page >= foods.data.totalPages} onClick={() => setPage(v => v + 1)}>Trang sau</button>
          </div>
        )}
      </section>
      <section className="admin-form-panel">
        <PanelHeading title={editingId ? 'Cập nhật thực phẩm' : 'Thêm thực phẩm mới'} note="Giá trị dinh dưỡng theo một khẩu phần tiêu chuẩn" />
        <div className="admin-form-grid">
          <TextField label="Tên" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField label="Danh mục" value={form.category} onChange={(category) => setForm({ ...form, category })} />
          <TextField label="Thẻ phân loại" value={form.tags ?? ''} onChange={(tags) => setForm({ ...form, tags })} />
          <TextField label="Phong cách ẩm thực" value={form.cuisine ?? ''} onChange={(cuisine) => setForm({ ...form, cuisine })} />
          <NumberField label="Khẩu phần tiêu chuẩn" value={form.defaultServingAmount} onChange={(defaultServingAmount) => setForm({ ...form, defaultServingAmount })} />
          <TextField label="Đơn vị" value={form.servingUnit} onChange={(servingUnit) => setForm({ ...form, servingUnit })} />
          <NumberField label="Năng lượng (kcal)" value={form.calories} onChange={(calories) => setForm({ ...form, calories })} />
          <NumberField label="Chất đạm (g)" value={form.proteinG} onChange={(proteinG) => setForm({ ...form, proteinG })} />
          <NumberField label="Tinh bột (g)" value={form.carbohydrateG} onChange={(carbohydrateG) => setForm({ ...form, carbohydrateG })} />
          <NumberField label="Chất béo (g)" value={form.fatG} onChange={(fatG) => setForm({ ...form, fatG })} />
          <NumberField label="Chất béo bão hòa (g)" value={form.saturatedFatG ?? 0} onChange={(saturatedFatG) => setForm({ ...form, saturatedFatG })} />
          <NumberField label="Đường (g)" value={form.sugarG ?? 0} onChange={(sugarG) => setForm({ ...form, sugarG })} />
          <NumberField label="Chất xơ (g)" value={form.fiberG ?? 0} onChange={(fiberG) => setForm({ ...form, fiberG })} />
        </div>
        <div className="admin-checks">
          {([
            ['isPlantBased', 'Có nguồn gốc thực vật'], ['isLegume', 'Nhóm đậu'],
            ['isWholeGrain', 'Ngũ cốc nguyên hạt'], ['isFish', 'Có cá'],
          ] as const).map(([key, label]) => (
            <label key={key}><input type="checkbox" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>
          ))}
        </div>
        {message && <p className="admin-message">{message}</p>}
        <div className="admin-form-actions">
          {editingId && <button onClick={() => { setEditingId(null); setForm(emptyFood); setMessage(null) }}>Hủy sửa</button>}
          <button className="primary-admin-action" disabled={save.isPending} onClick={() => save.mutate()}><Save size={14} /> {editingId ? 'Lưu thay đổi' : 'Thêm thực phẩm'}</button>
        </div>
      </section>
    </div>
  )
}

function RecipeAdmin() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SaveRecipeInput>(emptyRecipe)
  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const recipes = useQuery({
    queryKey: ['admin', 'recipes', page, search],
    queryFn: () => getRecipes({ page, pageSize: 20, search: search.trim() || undefined, sortBy: 'name' }, true),
  })
  const foods = useQuery({
    queryKey: ['admin', 'recipe-food-options', ingredientSearch],
    queryFn: () => getFoods({ page: 1, pageSize: 100, search: ingredientSearch.trim() || undefined, sortBy: 'name' }, false),
  })
  const allergens = useQuery({
    queryKey: ['admin', 'recipe-allergens'],
    queryFn: getAllergens,
  })

  const activeFoods = foods.data?.items ?? []

  const save = useMutation({
    mutationFn: () => editingRecipe ? updateRecipe(editingRecipe.id, form) : createRecipe(form),
    onSuccess: () => {
      setForm(emptyRecipe)
      setEditingRecipe(null)
      setMessage(editingRecipe ? 'Đã cập nhật công thức.' : 'Đã thêm công thức.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'recipes'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })

  const deactivate = useMutation({
    mutationFn: deactivateRecipe,
    onSuccess: () => {
      setMessage('Đã ngừng sử dụng công thức.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'recipes'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })

  const beginEdit = async (id: string) => {
    try {
      const detail = await getAdminRecipe(id)
      setEditingRecipe(detail)
      setForm({
        name: detail.name,
        description: detail.description,
        category: detail.category,
        cuisine: detail.cuisine ?? '',
        tags: detail.tags ?? '',
        servingCount: detail.servingCount,
        prepMinutes: detail.prepMinutes,
        caloriesPerServing: detail.caloriesPerServing,
        proteinGPerServing: detail.proteinGPerServing,
        carbohydrateGPerServing: detail.carbohydrateGPerServing,
        fatGPerServing: detail.fatGPerServing,
        saturatedFatGPerServing: detail.saturatedFatGPerServing ?? 0,
        sugarGPerServing: detail.sugarGPerServing ?? 0,
        fiberGPerServing: detail.fiberGPerServing ?? 0,
        isPlantForward: detail.isPlantForward,
        hasLegume: detail.hasLegume,
        hasWholeGrain: detail.hasWholeGrain,
        hasFish: detail.hasFish,
        ingredients: detail.ingredients.map((item) => ({
          foodId: item.foodId,
          amount: item.amount,
          unit: item.unit,
          isOptional: item.isOptional,
        })),
        allergenIds: detail.allergens.map((item) => item.id),
      })
      setMessage(null)
    } catch (error) {
      setMessage(getApiErrorMessage(error))
    }
  }

  const addIngredient = () => {
    const firstUnused = activeFoods.find(
      (food) => !form.ingredients.some((ingredient) => ingredient.foodId === food.id),
    )
    if (!firstUnused) {
      setMessage('Không còn thực phẩm đang hoạt động để thêm vào công thức.')
      return
    }

    setForm({
      ...form,
      ingredients: [
        ...form.ingredients,
        { foodId: firstUnused.id, amount: 100, unit: 'g', isOptional: false },
      ],
    })
  }

  const updateIngredient = (
    index: number,
    patch: Partial<SaveRecipeInput['ingredients'][number]>,
  ) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((ingredient, currentIndex) =>
        currentIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    })
  }

  const removeIngredient = (index: number) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((_, currentIndex) => currentIndex !== index),
    })
  }

  const toggleAllergen = (id: string) => {
    setForm({
      ...form,
      allergenIds: form.allergenIds.includes(id)
        ? form.allergenIds.filter((current) => current !== id)
        : [...form.allergenIds, id],
    })
  }

  return (
    <div className="admin-grid">
      <section className="admin-list-panel">
        <PanelHeading title="Công thức món ăn" note={String(recipes.data?.totalItems ?? 0) + ' mục'} />
        <label className="admin-field"><span>Tìm món ăn</span><input value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder="Tìm tên món ăn..." /></label>
        {recipes.isLoading && <AdminState>Đang tải công thức...</AdminState>}
        {recipes.isError && <AdminState error>Không thể tải công thức.</AdminState>}
        <div className="admin-item-list">
          {recipes.data?.items.map((recipe) => (
            <div className={recipe.isActive ? 'admin-item' : 'admin-item inactive'} key={recipe.id}>
              <div>
                <strong>{viContent(recipe.name)}</strong>
                <span>{viContent(recipe.category)} · {recipe.prepMinutes} phút · {recipe.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>
              </div>
              <div className="admin-item-actions">
                <Link to={'/catalog/recipes/' + recipe.id}>Xem</Link>
                <button onClick={() => void beginEdit(recipe.id)}>Sửa</button>
                {recipe.isActive && (
                  <button className="danger" onClick={() => deactivate.mutate(recipe.id)}>
                    <Trash2 size={13} /> Ngừng sử dụng
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {recipes.data && recipes.data.totalPages > 1 && (
          <div className="admin-page-navigation" aria-label="Phân trang món ăn">
            <button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Trang trước</button>
            <span>Trang {page}/{recipes.data.totalPages}</span>
            <button type="button" disabled={page >= recipes.data.totalPages} onClick={() => setPage(v => v + 1)}>Trang sau</button>
          </div>
        )}
      </section>

      <section className="admin-form-panel">
        <PanelHeading
          title={editingRecipe ? 'Cập nhật công thức' : 'Thêm công thức'}
          note="Nhập đầy đủ dữ liệu danh mục; không tự áp dụng số liệu dinh dưỡng hay tiêu chí đánh dấu mặc định."
        />
        <div className="admin-form-grid">
          <TextField label="Tên" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField label="Danh mục" value={form.category} onChange={(category) => setForm({ ...form, category })} />
          <TextField label="Phong cách ẩm thực" value={form.cuisine ?? ''} onChange={(cuisine) => setForm({ ...form, cuisine })} />
          <TextField label="Thẻ phân loại" value={form.tags ?? ''} onChange={(tags) => setForm({ ...form, tags })} />
          <label className="admin-field span-2">
            <span>Mô tả</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <NumberField label="Khẩu phần" value={form.servingCount} onChange={(servingCount) => setForm({ ...form, servingCount })} />
          <NumberField label="Thời gian chuẩn bị (phút)" value={form.prepMinutes} onChange={(prepMinutes) => setForm({ ...form, prepMinutes })} />
          <NumberField label="Năng lượng mỗi khẩu phần (kcal)" value={form.caloriesPerServing} onChange={(caloriesPerServing) => setForm({ ...form, caloriesPerServing })} />
          <NumberField label="Chất đạm mỗi khẩu phần (g)" value={form.proteinGPerServing} onChange={(proteinGPerServing) => setForm({ ...form, proteinGPerServing })} />
          <NumberField label="Tinh bột mỗi khẩu phần (g)" value={form.carbohydrateGPerServing} onChange={(carbohydrateGPerServing) => setForm({ ...form, carbohydrateGPerServing })} />
          <NumberField label="Chất béo mỗi khẩu phần (g)" value={form.fatGPerServing} onChange={(fatGPerServing) => setForm({ ...form, fatGPerServing })} />
          <NumberField label="Chất béo bão hòa (g)" value={form.saturatedFatGPerServing ?? 0} onChange={(saturatedFatGPerServing) => setForm({ ...form, saturatedFatGPerServing })} />
          <NumberField label="Đường (g)" value={form.sugarGPerServing ?? 0} onChange={(sugarGPerServing) => setForm({ ...form, sugarGPerServing })} />
          <NumberField label="Chất xơ (g)" value={form.fiberGPerServing ?? 0} onChange={(fiberGPerServing) => setForm({ ...form, fiberGPerServing })} />
        </div>

        <div className="admin-checks">
          {([
            ['isPlantForward', 'Ưu tiên thực vật'],
            ['hasLegume', 'Có các loại đậu'],
            ['hasWholeGrain', 'Có ngũ cốc nguyên hạt'],
            ['hasFish', 'Có cá'],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="admin-form-divider" />
        <PanelHeading title="Nguyên liệu cấu thành món ăn" note="Có thể tìm nguyên liệu theo tên rồi thêm. Mỗi nguyên liệu chỉ xuất hiện một lần." />
        <label className="admin-field"><span>Tìm nguyên liệu để thêm</span><input value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} placeholder="Nhập tên nguyên liệu, kể cả ngoài 100 mục đầu..." /></label>
        <div className="ingredient-admin-list">
          {form.ingredients.map((ingredient, index) => (
            <div className="ingredient-admin-row" key={String(index) + ingredient.foodId}>
              <label className="admin-field">
                <span>Thực phẩm</span>
                <select
                  value={ingredient.foodId}
                  onChange={(event) => updateIngredient(index, { foodId: event.target.value })}
                >
                  {!activeFoods.some(food => food.id === ingredient.foodId) && (
                    <option value={ingredient.foodId}>
                      {editingRecipe?.ingredients.find(item => item.foodId === ingredient.foodId)?.foodName ?? 'Nguyên liệu đang chọn'}
                    </option>
                  )}
                  {activeFoods.map((food) => (
                    <option
                      value={food.id}
                      key={food.id}
                      disabled={form.ingredients.some(
                        (current, currentIndex) =>
                          currentIndex !== index && current.foodId === food.id,
                      )}
                    >
                      {viContent(food.name)}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField label="Định lượng" value={ingredient.amount} onChange={(amount) => updateIngredient(index, { amount })} />
              <TextField label="Đơn vị" value={ingredient.unit} onChange={(unit) => updateIngredient(index, { unit })} />
              <label className="ingredient-optional">
                <input
                  type="checkbox"
                  checked={ingredient.isOptional}
                  onChange={(event) => updateIngredient(index, { isOptional: event.target.checked })}
                />
                Tùy chọn
              </label>
              <button className="ingredient-remove" onClick={() => removeIngredient(index)} type="button">
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          ))}
        </div>
        <button className="inline-admin-action" type="button" onClick={addIngredient} disabled={activeFoods.length === 0}>
          <Plus size={13} /> Thêm nguyên liệu
        </button>

        <div className="admin-form-divider" />
        <PanelHeading title="Các chất gây dị ứng" note="Chọn từ danh mục chất gây dị ứng đang hoạt động." />
        {allergens.isLoading && <AdminState>Đang tải chất gây dị ứng...</AdminState>}
        {allergens.isError && <AdminState error>Không thể tải chất gây dị ứng.</AdminState>}
        <div className="admin-checks">
          {allergens.data?.map((allergen) => (
            <label key={allergen.id}>
              <input
                type="checkbox"
                checked={form.allergenIds.includes(allergen.id)}
                onChange={() => toggleAllergen(allergen.id)}
              />
              {viContent(allergen.name)}
            </label>
          ))}
        </div>

        {message && <p className="admin-message">{message}</p>}
        <div className="admin-form-actions">
          {editingRecipe && (
            <button
              onClick={() => {
                setEditingRecipe(null)
                setForm(emptyRecipe)
                setMessage(null)
              }}
            >
              Hủy sửa
            </button>
          )}
          <button
            className="primary-admin-action"
            disabled={
              save.isPending ||
              !form.name.trim() ||
              !form.description.trim() ||
              !form.category.trim() ||
              form.servingCount < 1 ||
              form.ingredients.length === 0
            }
            onClick={() => save.mutate()}
          >
            <Save size={14} /> {editingRecipe ? 'Lưu công thức' : 'Thêm công thức'}
          </button>
        </div>
      </section>
    </div>
  )
}

function RuleAdmin() {
  const queryClient = useQueryClient()
  const [medicalQueueOnly, setMedicalQueueOnly] = useState(false)
  const [queuePage, setQueuePage] = useState(1)
  const reviewQueue = useQuery({
    queryKey: ['admin', 'rule-review-queue', queuePage, medicalQueueOnly],
    queryFn: () => getRuleReviewQueue(queuePage, medicalQueueOnly ? true : undefined),
  })
  const [ruleKey, setRuleKey] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Nutrition')
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [citation, setCitation] = useState('')
  const [parametersJson, setParametersJson] = useState('{}')
  const [isMedicalSensitive, setIsMedicalSensitive] = useState(false)
  const [sourceType, setSourceType] = useState(2)
  const [evidenceLevel, setEvidenceLevel] = useState(2)
  const [message, setMessage] = useState<string | null>(null)
  const rules = useQuery({ queryKey: ['admin', 'rules'], queryFn: () => getRules(true) })
  const selectedRule = useMemo(() => rules.data?.find((rule) => rule.id === selectedRuleId) ?? rules.data?.[0], [rules.data, selectedRuleId])
  const addRule = useMutation({
    mutationFn: () => createRule({ ruleKey, title, description, category, isMedicalSensitive }),
    onSuccess: (rule) => {
      setRuleKey(''); setTitle(''); setDescription(''); setIsMedicalSensitive(false); setSelectedRuleId(rule.id)
      setMessage('Đã tạo quy tắc. Hãy bổ sung phiên bản có nguồn minh bạch trước khi xuất bản.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })
  const addVersion = useMutation({
    mutationFn: () => createRuleVersion(selectedRule!.id, {
      parametersJson, sourceUrl, sourceType, citation, evidenceLevel, effectiveAt: null,
    }),
    onSuccess: () => {
      setMessage('Đã tạo phiên bản nháp.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
    },
    onError: (error) => setMessage(getApiErrorMessage(error)),
  })


  return (
    <div className="admin-grid rules-admin-grid">
      <section className="admin-list-panel">
        <PanelHeading title="Quy tắc và phiên bản" note={String(rules.data?.length ?? 0) + ' quy tắc'} />
        <section className="surface-card" style={{ padding: '1rem', marginBlock: '.8rem' }} aria-label="Danh sách quy tắc chờ rà soát an toàn">
          <h3>Danh sách chờ duyệt về an toàn</h3>
          <label>
            <input type="checkbox" checked={medicalQueueOnly}
              onChange={(event) => { setMedicalQueueOnly(event.target.checked); setQueuePage(1) }} />
            {' '}Chỉ các quy tắc nhạy cảm về y khoa
          </label>
          {reviewQueue.isLoading && <p>Đang tải danh sách chờ duyệt...</p>}
          {reviewQueue.isError && <p role="alert">{getApiErrorMessage(reviewQueue.error)}</p>}
          {reviewQueue.data?.items.length === 0 && <p>Không có quy tắc nào đang chờ duyệt.</p>}
          {reviewQueue.data?.items.map((item) => (
            <div key={item.ruleVersionId} style={{ marginBlock: '.6rem' }}>
              <button type="button" onClick={() => setSelectedRuleId(item.dietRuleId)}>
                {item.ruleKey} v{item.versionNumber} — {viContent(item.ruleTitle)}
              </button>
              <p>Mức độ bằng chứng: {item.evidenceLevel}
                {item.isMedicalSensitive ? ' · Cần rà soát an toàn y khoa' : ''}
              </p>
            </div>
          ))}
          {(reviewQueue.data?.totalPages ?? 0) > 1 && (
            <div className="admin-form-actions">
              <button type="button" disabled={queuePage <= 1}
                onClick={() => setQueuePage((page) => page - 1)}>Trước</button>
              <span>Trang {queuePage} / {reviewQueue.data?.totalPages}</span>
              <button type="button" disabled={queuePage >= (reviewQueue.data?.totalPages ?? 0)}
                onClick={() => setQueuePage((page) => page + 1)}>Sau</button>
            </div>
          )}
        </section>
        {rules.isLoading && <AdminState>Đang tải quy tắc...</AdminState>}
        <div className="admin-item-list">
          {rules.data?.map((rule) => (
            <button className={'admin-rule-select ' + (selectedRule?.id === rule.id ? 'selected' : '')} onClick={() => setSelectedRuleId(rule.id)} key={rule.id}>
              <strong>{viContent(rule.title)}</strong><span>{rule.ruleKey} · {rule.versions.length} phiên bản</span>
            </button>
          ))}
        </div>
        {selectedRule && (
          <div className="rule-version-admin-list">
            <h3>{viContent(selectedRule.title)}</h3>
            {selectedRule.versions.map((version) => (
              <div key={version.id}>
                <span>v{version.versionNumber} · {({ 1: 'Bản nháp', 2: 'Đã xuất bản', 3: 'Ngừng áp dụng', 4: 'Đang duyệt' } as Record<number, string>)[version.state]}</span>
                <strong>{viContent(version.citation) || 'Chưa có nguồn trích dẫn'}</strong>
                <RuleGovernance version={version} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="admin-form-panel">
        <PanelHeading title="Tạo quy tắc" note="Mã quy tắc, mô tả và danh mục là bắt buộc" />
        <div className="admin-form-grid">
          <TextField label="Mã quy tắc" value={ruleKey} onChange={setRuleKey} />
          <TextField label="Danh mục" value={category} onChange={setCategory} />
          <TextField label="Tiêu đề" value={title} onChange={setTitle} className="span-2" />
          <label className="admin-field span-2"><span>Mô tả</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="ingredient-optional span-2">
            <input type="checkbox" checked={isMedicalSensitive} onChange={(event) => setIsMedicalSensitive(event.target.checked)} />
            Quy tắc này nhạy cảm về y khoa
          </label>
        </div>
        <div className="admin-form-actions"><button className="primary-admin-action" disabled={addRule.isPending || !ruleKey.trim() || !title.trim() || !description.trim()} onClick={() => addRule.mutate()}><Plus size={14} /> Tạo quy tắc</button></div>
        <div className="admin-form-divider" />
        <PanelHeading title="Tạo phiên bản nháp" note={selectedRule ? 'Cho ' + selectedRule.ruleKey : 'Hãy chọn một quy tắc trước'} />
        <div className="admin-form-grid">
          <TextField label="Đường dẫn nguồn (URL)" value={sourceUrl} onChange={setSourceUrl} className="span-2" />
          <TextField label="Trích dẫn nguồn" value={citation} onChange={setCitation} className="span-2" />
          <label className="admin-field">
            <span>Loại nguồn</span>
            <select value={sourceType} onChange={(event) => setSourceType(Number(event.target.value))}>
              <option value={1}>Sách</option>
              <option value={2}>Hướng dẫn chính thức</option>
              <option value={3}>Nghiên cứu đã bình duyệt</option>
              <option value={4}>Nhóm xây dựng</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Mức độ bằng chứng</span>
            <select value={evidenceLevel} onChange={(event) => setEvidenceLevel(Number(event.target.value))}>
              <option value={1}>Thấp</option>
              <option value={2}>Trung bình</option>
              <option value={3}>Cao</option>
            </select>
          </label>
          <label className="admin-field span-2"><span>Tham số kỹ thuật (JSON)</span><textarea value={parametersJson} onChange={(event) => setParametersJson(event.target.value)} /></label>
        </div>
        {message && <p className="admin-message">{message}</p>}
        <div className="admin-form-actions"><button className="primary-admin-action" disabled={addVersion.isPending || !selectedRule || !sourceUrl.trim() || !citation.trim()} onClick={() => addVersion.mutate()}><Plus size={14} /> Tạo phiên bản nháp</button></div>
      </section>
    </div>
  )
}

function RuleGovernance({ version }: { version: RuleVersion }) {
  const queryClient = useQueryClient()
  const [showImpact, setShowImpact] = useState(false)
  const impact = useQuery({
    queryKey: ['admin', 'rule-impact', version.id],
    queryFn: () => getRuleImpact(version.id),
    enabled: showImpact,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const history = useQuery({
    queryKey: ['admin', 'rule-history', version.id, page, actionFilter],
    queryFn: () => getRuleHistory(version.id, page, actionFilter), enabled: showHistory,
  })
  const transition = useMutation({
    mutationFn: (action: 'review' | 'rejection' | 'publication' | 'retirement') => transitionRuleVersion(version.id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rule-history', version.id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rule-review-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rule-impact', version.id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'rules'] })
    },
  })
  return <section aria-label={`Quản lý phiên bản ${version.versionNumber}`}>
    <p>Loại nguồn: {version.sourceType}  |  Bằng chứng: {version.evidenceLevel}</p>
    <a href={version.sourceUrl} target="_blank" rel="noreferrer">Mở nguồn</a>
    <details><summary>Xem tham số và nguồn gốc</summary>
      <p>{version.citation}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{version.parametersJson}</pre>
      <p>Có hiệu lực: {version.effectiveAt ?? 'Khi xuất bản'}  |  Xuất bản: {version.publishedAt ?? 'Chưa xuất bản'}</p>
    </details>
    {version.state === 1 && <button disabled={transition.isPending} onClick={() => transition.mutate('review')}>Gửi yêu cầu duyệt</button>}
    {version.state === 4 && <>
      <button disabled={transition.isPending} onClick={() => transition.mutate('rejection')}>Trả về bản nháp</button>
      <button disabled={transition.isPending} onClick={() => transition.mutate('publication')}>Duyệt và xuất bản</button>
      <small>Cần duyệt độc lập: quản trị viên khác phải phê duyệt phiên bản này.</small>
    </>}
    {version.state === 2 && <button disabled={transition.isPending} onClick={() => transition.mutate('retirement')}>Ngừng sử dụng phiên bản</button>}
    {version.state === 3 && <p>Phiên bản đã ngừng sử dụng. Các tham chiếu trong lịch sử được giữ lại.</p>}
    {transition.isError && <p role="alert">{getApiErrorMessage(transition.error)}</p>}
    <button type="button" aria-expanded={showImpact}
      onClick={() => setShowImpact(!showImpact)}>Xem ảnh hưởng tới thực đơn và phiên bản</button>
    {showImpact && <div aria-live="polite">
      {impact.isLoading && <p>Đang kiểm tra các tham chiếu bộ quy tắc...</p>}
      {impact.isError && <p role="alert">{getApiErrorMessage(impact.error)}</p>}
      {impact.data && <>
        <p>Được tham chiếu bởi {impact.data.referencingRuleSets} bộ quy tắc,
          {impact.data.totalHistoricalPlans} thực đơn lịch sử,
          {impact.data.currentActivePlans} thực đơn đang hoạt động.</p>
        <ul>
          {impact.data.ruleSets.map((item) => <li key={item.ruleSetVersion}>
            {item.ruleSetVersion} · {item.isActiveRuleSet ? 'Bộ quy tắc đang hoạt động' : 'Bộ quy tắc lưu trữ'}
            {' '}· {item.totalPlans} thực đơn · {item.distinctUsers} thành viên khác nhau
          </li>)}
          {impact.data.ruleSets.length === 0 && <li>Chưa có bộ quy tắc tham chiếu.</li>}
        </ul>
        <small>Chỉ hiển thị số lượng; không tiết lộ danh tính thành viên hoặc hồ sơ sức khỏe.</small>
      </>}
    </div>}
    <button aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>Lịch sử kiểm tra và thay đổi</button>
    {showHistory && <div aria-live="polite">
      <label>Lọc loại thay đổi <select value={actionFilter} onChange={event => { setActionFilter(event.target.value); setPage(1) }}>
        <option value="">Tất cả thay đổi</option>
        {['Created', 'Edited', 'Submitted', 'Rejected', 'Published', 'Retired'].map(action => <option key={action} value={action}>{viContent(action)}</option>)}
      </select></label>
      {history.isLoading && <p>Đang tải lịch sử...</p>}
      {history.isError && <p role="alert">{getApiErrorMessage(history.error)}</p>}
      {history.data?.items.length === 0 && <p>Không có bản ghi kiểm tra ở trang này. Các phiên bản tạo trước đây không có nhật ký truy hồi.</p>}
      {history.data?.items.map(entry => <p key={entry.id}>
        v{entry.versionNumber}  |  {viContent(entry.action)}  |  {new Date(entry.occurredAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}  |  Người thao tác: {entry.actorId}<br />{entry.details}
      </p>)}
      <button disabled={page === 1 || history.isFetching} onClick={() => setPage(page - 1)}>Trang lịch sử trước</button>
      <span> Page {page}  |  {history.data?.totalItems ?? 0} bản ghi </span>
      <button disabled={history.isFetching || page >= (history.data?.totalPages ?? 0)} onClick={() => setPage(page + 1)}>Trang lịch sử sau</button>
    </div>}
  </section>
}

function PanelHeading({ title, note }: { title: string; note: string }) {
  return <div className="admin-panel-heading"><div><span className="micro-label">QUẢN LÝ DANH MỤC</span><h2>{title}</h2></div><small>{note}</small></div>
}

function AdminState({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={'catalog-state ' + (error ? 'error' : '')}>{children}</div>
}

function TextField({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={'admin-field ' + className}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="admin-field"><span>{label}</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
