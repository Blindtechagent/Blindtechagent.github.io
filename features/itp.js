// Global variables
const imageContainer = document.getElementById('imageContainer');
const convertButton = document.getElementById('convertButton');
const clearButton = document.getElementById('clearButton');
const downloadPdfButton = document.getElementById('dwnPdf');
let imageFiles = [];
const jsPDF = window.jspdf.jsPDF;

// Functions
const updateActionButtons = () => {
  const actionButtons = document.getElementById('action-buttons');
  if (actionButtons) actionButtons.style.display = imageFiles.length > 0 ? 'block' : 'none';
};

const renderImages = () => {
  imageContainer.innerHTML = '';
  imageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const imageBox = createImageBox(reader.result, index);
      imageContainer.appendChild(imageBox);
      announce("Image added successfully");
    };
  });
  updateActionButtons();
};

const createImageBox = (src, index) => {
  const imageBox = document.createElement('div');
  imageBox.classList.add('imageBox');
  imageBox.setAttribute('data-index', index);
  imageBox.innerHTML = `
    <img src="${src}">
    <button aria-label="Remove this image" class="deleteButton" data-index="${index}">&times;</button>
  `;
  return imageBox;
};

const deleteImage = (index) => {
  imageFiles.splice(index, 1);
  renderImages();
  announce("Image removed successfully");
};
function convertToPdf() {
    if (imageFiles.length === 0) {
      announce("Please add at least one image before converting");
      return;
    }
    document.getElementById('fileDialog').showModal();
    document.getElementById('fileName').focus();
}

const downloadPdf = () => {
  const fileName = document.getElementById('fileName').value;
  if (!fileName) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth() - 20;
  let imagesProcessed = 0;

  imageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const scaleFactor = pageWidth / img.width;
        const imageHeight = img.height * scaleFactor;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = canvas.toDataURL('image/jpeg');

        if (index === 0) {
          doc.addImage(imageData, 'JPEG', 10, 10, pageWidth, imageHeight);
        } else {
          doc.addPage();
          doc.addImage(imageData, 'JPEG', 10, 10, pageWidth, imageHeight);
        }

        imagesProcessed++;
        if (imagesProcessed === imageFiles.length) {
          doc.save(`${fileName}.pdf`);
          announce("Start downloading");
          document.getElementById('fileDialog').close();
        }
      };
    };
  });
};

// Event listeners
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', (e) => {
  const selectedFiles = Array.from(e.target.files);
  imageFiles = [...imageFiles, ...selectedFiles];
  renderImages();
});

convertButton.addEventListener('click', () => {
  convertToPdf();
});
downloadPdfButton.addEventListener('click', downloadPdf);

document.querySelector('#addImageButton').addEventListener('click', (event) => {
  event.stopPropagation(); // prevent the click bubbling to .upload-area, which would open the picker a second time
  fileInput.click();
});

imageContainer.addEventListener('click', (event) => {
  if (event.target.classList.contains('deleteButton')) {
    const index = parseInt(event.target.dataset.index);
    deleteImage(index);
  }
});

clearButton.addEventListener('click', () => {
  imageFiles = [];
  renderImages();
});
