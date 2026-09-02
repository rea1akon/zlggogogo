// 资源注册表：定义每个业务对象的表、字段规则与查询能力
// 所有 SQL 中的列名均取自此处白名单，杜绝拼接注入

const AREAS = ['片所本级', '庄市', '骆驼', '贵驷'];

const T = {
  text: (max = 500, extra = {}) => ({ type: 'text', max, ...extra }),
  integer: (extra = {}) => ({ type: 'integer', ...extra }),
  real: (extra = {}) => ({ type: 'real', ...extra }),
  date: (extra = {}) => ({ type: 'date', ...extra }),
  enum: (values, extra = {}) => ({ type: 'enum', values, ...extra }),
};

export const RESOURCES = {
  employees: {
    table: 'employees',
    label: '员工档案',
    defaultSort: 'id',
    searchFields: ['name', 'phone', 'position', 'id_card'],
    filterFields: ['area', 'employment_type', 'gender'],
    fields: {
      name: { ...T.text(50), required: true },
      gender: T.enum(['男', '女']),
      id_card: { ...T.text(18), pattern: /^\d{17}[\dXx]$/, patternMsg: '身份证号需为 18 位' },
      birth_date: T.date(),
      age: { ...T.integer(), minValue: 0, maxValue: 130 },
      phone: { ...T.text(11), pattern: /^1[3-9]\d{9}$/, patternMsg: '手机号格式不正确' },
      native_place: T.text(100),
      position: T.text(100),
      area: T.enum(AREAS),
      employment_type: T.enum(['事业', '企业', '密集型', '劳务派遣', '劳务外包']),
      hire_date: T.date(),
      address: T.text(200),
      remark: T.text(1000),
    },
  },

  vehicles: {
    table: 'vehicles',
    label: '车辆台账',
    defaultSort: 'id',
    searchFields: ['plate_no', 'driver_name', 'model'],
    filterFields: ['area', 'vehicle_type', 'status'],
    fields: {
      plate_no: { ...T.text(20), required: true },
      vehicle_type: T.enum(['污水车', '清扫车', '洒水车', '巡查车', '工程车', '其他']),
      model: T.text(100),
      driver_name: T.text(50),
      driver_phone: { ...T.text(11), pattern: /^1[3-9]\d{9}$/, patternMsg: '手机号格式不正确' },
      area: T.enum(AREAS),
      status: { ...T.enum(['idle', 'working', 'maintenance', 'scrapped']), defaultValue: 'idle' },
      mileage: { ...T.integer(), minValue: 0 },
      last_maintain_at: T.date(),
      next_maintain_at: T.date(),
      remark: T.text(1000),
    },
  },

  items: {
    table: 'warehouse_items',
    label: '仓库物资',
    defaultSort: 'id',
    searchFields: ['name', 'code', 'category', 'spec'],
    filterFields: ['area', 'category'],
    fields: {
      code: T.text(50),
      name: { ...T.text(100), required: true },
      category: T.text(50),
      spec: T.text(100),
      unit: T.text(20),
      quantity: { ...T.integer(), minValue: 0, defaultValue: 0 },
      min_stock: { ...T.integer(), minValue: 0, defaultValue: 0 },
      unit_price: { ...T.real(), minValue: 0, defaultValue: 0 },
      location: T.text(100),
      area: T.enum(AREAS),
      remark: T.text(1000),
    },
  },

  projects: {
    table: 'projects',
    label: '工程项目',
    defaultSort: 'id',
    searchFields: ['name', 'code', 'manager', 'contractor'],
    filterFields: ['area', 'status', 'category'],
    fields: {
      code: T.text(50),
      name: { ...T.text(200), required: true },
      category: T.enum(['养护维修', '改造提升', '应急抢修', '日常巡检', '其他']),
      area: T.enum(AREAS),
      status: { ...T.enum(['planned', 'ongoing', 'paused', 'done', 'archived']), defaultValue: 'planned' },
      manager: T.text(50),
      contractor: T.text(200),
      start_date: T.date(),
      end_date: T.date(),
      budget: { ...T.real(), minValue: 0, defaultValue: 0 },
      progress: { ...T.integer(), minValue: 0, maxValue: 100, defaultValue: 0 },
      remark: T.text(2000),
    },
  },

  records: {
    table: 'business_records',
    label: '养护台账',
    defaultSort: 'id',
    searchFields: ['record_no', 'road_name', 'content', 'operator'],
    filterFields: ['area', 'record_type', 'status'],
    fields: {
      record_no: T.text(50),
      record_type: T.enum(['管网疏通', '井盖维修', '道路养护', '绿化养护', '清淤', '应急', '其他']),
      area: T.enum(AREAS),
      road_name: T.text(200),
      content: T.text(2000),
      amount: { ...T.real(), minValue: 0, defaultValue: 0 },
      status: { ...T.enum(['pending', 'processing', 'done', 'rejected']), defaultValue: 'pending' },
      occurred_at: T.date(),
      operator: T.text(50),
      remark: T.text(2000),
    },
  },
};

export function getResource(name) {
  const res = RESOURCES[name];
  if (!res) {
    const err = new Error(`未知资源类型：${name}`);
    err.status = 404;
    err.code = 'RESOURCE_NOT_FOUND';
    err.details = { available: Object.keys(RESOURCES) };
    throw err;
  }
  return res;
}

/** 导出给前端的元数据（不含敏感信息） */
export function resourceMeta() {
  return Object.entries(RESOURCES).map(([key, r]) => ({
    key,
    label: r.label,
    fields: Object.entries(r.fields).map(([name, spec]) => ({
      name,
      type: spec.type,
      required: !!spec.required,
      values: spec.values || null,
    })),
    filterFields: r.filterFields,
  }));
}
