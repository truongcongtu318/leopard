import type { VehicleType } from '@prisma/client';

import type { PdfLabeledField, PdfSection } from '../pdf/pdf.types.js';

/**
 * Versioned driver contract content. Kept separate from any orchestration
 * (PdfService, DriverApplicationService) so a future `v2` is an additive
 * new constant rather than a mutation of the text a driver already signed —
 * evidence for a signed `DriverContract` row must stay reproducible from its
 * recorded `version` alone.
 *
 * The legal wording below is drafting-quality content approved for use while
 * awaiting formal legal review (see the design spec's controller ledger
 * ruling); it is structurally complete — parties, service terms, payment
 * terms, obligations, termination, dispute resolution — and not a
 * placeholder.
 */
export const CONTRACT_VERSION = 'v1';

export interface DriverContractPartyDetails {
  readonly driverName: string;
  readonly driverPhone: string;
  readonly vehicleTypeLabel: string;
  readonly licensePlate: string;
  readonly licenseNumber: string;
}

export const DRIVER_CONTRACT_DOCUMENT_TITLE = 'HỢP ĐỒNG HỢP TÁC VẬN CHUYỂN';

/** Vietnamese vehicle-type labels for the contract's printed party fields. */
export const VEHICLE_TYPE_LABELS_VI: Readonly<Record<VehicleType, string>> = {
  MOTORBIKE: 'Xe máy / Ba gác',
  VAN: 'Xe van',
  TRUCK: 'Xe tải',
};

/**
 * Placeholder party-B details for the unsigned, read-only preview PDF
 * (`GET /driver/contract/pdf`) — rendered before any applicant data exists,
 * so it must not depend on a driver profile or DB read.
 */
const PREVIEW_PLACEHOLDER = '(Điền khi nộp hồ sơ đăng ký)';

export const DRIVER_CONTRACT_PREVIEW_PARTY_DETAILS: DriverContractPartyDetails = {
  driverName: PREVIEW_PLACEHOLDER,
  driverPhone: PREVIEW_PLACEHOLDER,
  vehicleTypeLabel: PREVIEW_PLACEHOLDER,
  licensePlate: PREVIEW_PLACEHOLDER,
  licenseNumber: PREVIEW_PLACEHOLDER,
};

export function buildDriverContractPartyFields(
  details: DriverContractPartyDetails,
): readonly PdfLabeledField[] {
  return [
    { label: 'Bên A (Nền tảng)', value: 'Công ty Leopard' },
    { label: 'Bên B (Tài xế)', value: details.driverName },
    { label: 'Số điện thoại', value: details.driverPhone },
    { label: 'Loại phương tiện', value: details.vehicleTypeLabel },
    { label: 'Biển số xe', value: details.licensePlate },
    { label: 'Số giấy phép lái xe', value: details.licenseNumber },
  ];
}

export const DRIVER_CONTRACT_SECTIONS_V1: readonly PdfSection[] = [
  {
    heading: 'Điều 1. Các bên tham gia hợp đồng',
    paragraphs: [
      'Bên A (Nền tảng): Công ty Leopard, đơn vị vận hành nền tảng trung gian kết nối vận chuyển Leopard, sau đây gọi là "Nền tảng".',
      'Bên B (Tài xế): Là cá nhân đăng ký trở thành đối tác tài xế trên Nền tảng, có thông tin cụ thể được nêu tại phần thông tin các bên ở trên, sau đây gọi là "Tài xế".',
      'Hợp đồng này được giao kết bằng phương thức điện tử ngay khi Tài xế xác nhận đồng ý và ký tên tại bước đăng ký trở thành đối tác tài xế trên ứng dụng Leopard.',
    ],
  },
  {
    heading: 'Điều 2. Điều khoản dịch vụ',
    paragraphs: [
      'Tài xế tự nguyện đăng ký sử dụng phương tiện thuộc sở hữu hoặc quyền sử dụng hợp pháp của mình để thực hiện các đơn vận chuyển hàng hóa được Nền tảng phân bổ thông qua ứng dụng.',
      'Tài xế có quyền chủ động nhận hoặc từ chối từng đơn vận chuyển cụ thể; Nền tảng không đảm bảo số lượng đơn hàng tối thiểu trong bất kỳ khoảng thời gian nào.',
      'Tài xế cam kết thực hiện việc vận chuyển đúng lộ trình, đúng thời gian và bảo đảm an toàn hàng hóa được giao cho đến khi hoàn tất giao hàng, đồng thời tuân thủ hướng dẫn vận hành hiển thị trên ứng dụng.',
    ],
  },
  {
    heading: 'Điều 3. Điều khoản thanh toán',
    paragraphs: [
      'Cước phí vận chuyển của từng đơn hàng được Nền tảng tính toán và hiển thị công khai cho Tài xế trước khi Tài xế xác nhận nhận đơn.',
      'Nền tảng có trách nhiệm đối soát và chi trả cho Tài xế phần cước phí tương ứng sau khi khấu trừ tỷ lệ phí dịch vụ nền tảng (nếu có) theo chính sách chiết khấu hiện hành được công bố trên ứng dụng, theo chu kỳ thanh toán mà Nền tảng quy định.',
      'Mọi khoản thanh toán được ghi nhận thông qua hệ thống của Nền tảng và Tài xế có thể tra cứu lịch sử thu nhập của mình trên ứng dụng.',
    ],
  },
  {
    heading: 'Điều 4. Quyền và nghĩa vụ của các bên',
    paragraphs: [
      'Bên A có nghĩa vụ cung cấp và duy trì hoạt động ổn định của ứng dụng, hỗ trợ Tài xế trong quá trình vận hành, và xử lý khiếu nại phát sinh từ khách hàng liên quan đến đơn hàng một cách công bằng, minh bạch.',
      'Bên B có nghĩa vụ cung cấp thông tin cá nhân, giấy tờ xe và giấy phép lái xe trung thực, chính xác; giữ gìn tình trạng phương tiện an toàn kỹ thuật; ứng xử lịch sự, chuyên nghiệp với khách hàng; không sử dụng chất kích thích khi điều khiển phương tiện thực hiện đơn hàng.',
      'Tài xế chịu trách nhiệm về hành vi của mình trong quá trình thực hiện vận chuyển và bồi thường thiệt hại (nếu có) do lỗi của Tài xế gây ra đối với hàng hóa hoặc bên thứ ba theo quy định pháp luật.',
    ],
  },
  {
    heading: 'Điều 5. Chấm dứt hợp đồng',
    paragraphs: [
      'Mỗi bên có quyền đơn phương chấm dứt hợp đồng hợp tác này bất kỳ lúc nào bằng cách thông báo qua ứng dụng hoặc kênh liên hệ chính thức của Nền tảng, không cần nêu lý do, trừ trường hợp pháp luật có quy định khác.',
      'Nền tảng có quyền tạm ngừng hoặc chấm dứt ngay việc hợp tác với Tài xế trong trường hợp Tài xế vi phạm nghiêm trọng nghĩa vụ tại Điều 4, cung cấp thông tin gian dối, hoặc có hành vi gây nguy hiểm cho khách hàng và cộng đồng.',
      'Việc chấm dứt hợp đồng không làm ảnh hưởng đến quyền được nhận các khoản thanh toán phát sinh từ các đơn hàng đã hoàn thành trước thời điểm chấm dứt.',
    ],
  },
  {
    heading: 'Điều 6. Giải quyết tranh chấp',
    paragraphs: [
      'Mọi tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này trước hết được các bên giải quyết thông qua thương lượng, hòa giải trên tinh thần thiện chí, hợp tác.',
      'Trường hợp không thể thương lượng thành, tranh chấp sẽ được đưa ra giải quyết tại Tòa án có thẩm quyền theo quy định của pháp luật Việt Nam.',
      'Hợp đồng này và mọi vấn đề phát sinh được điều chỉnh bởi pháp luật hiện hành của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.',
    ],
  },
];
