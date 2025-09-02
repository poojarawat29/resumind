import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const handleAnalyze = async ({
                                     companyName,
                                     jobTitle,
                                     jobDescription,
                                     file,
                                 }: { companyName: string; jobTitle: string; jobDescription: string; file: File }) => {
        setIsProcessing(true);

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) return setStatusText('Error: Failed to upload file');

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) {
                console.error('PDF conversion failed:', imageFile.error);
                setStatusText(`Error: Failed to convert PDF to image - ${imageFile.error || 'Unknown error'}`);
                setIsProcessing(false);
                return;
            }
            console.log('PDF converted to image successfully:', imageFile);

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if (!uploadedImage) {
                console.error('Image upload failed');
                setStatusText('Error: Failed to upload image');
                setIsProcessing(false);
                return;
            }
            console.log('Image uploaded successfully:', uploadedImage);

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: '',
            };
            console.log('Data prepared:', data);

            const kvResult = await kv.set(`resume:${uuid}`, JSON.stringify(data));
            console.log('Data saved to KV:', kvResult);

            setStatusText('Analyzing...');
            console.log('Starting AI analysis with path:', uploadedFile.path);
            console.log('Instructions:', prepareInstructions({ jobTitle, jobDescription, AIResponseFormat: "JSON" }));

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription, AIResponseFormat: "JSON" })
            );

            if (!feedback) {
                console.error('AI analysis failed - no feedback returned');
                setStatusText('Error: Failed to analyze resume - AI analysis failed');
                setIsProcessing(false);
                return;
            }

            console.log('AI feedback received:', feedback);

            const feedbackText =
                typeof feedback.message.content === 'string'
                    ? feedback.message.content
                    : feedback.message.content[0].text;

            console.log('Feedback text to parse:', feedbackText);

            try {
                const parsedFeedback = JSON.parse(feedbackText);
                console.log('Parsed feedback:', parsedFeedback);

                data.feedback = parsedFeedback;
                const finalKvResult = await kv.set(`resume:${uuid}`, JSON.stringify(data));
                console.log('Final data saved to KV:', finalKvResult);

                setStatusText('Analysis complete, redirecting...');
                console.log('Final data before navigation:', data);

                // Add a small delay to ensure the user sees the completion message
                setTimeout(() => {
                    navigate(`/resume/${uuid}`);
                }, 1000);
            } catch (parseError) {
                console.error('Failed to parse AI feedback as JSON:', parseError);
                console.error('Raw feedback text:', feedbackText);
                setStatusText('Error: Failed to parse AI analysis results');
                setIsProcessing(false);
                return;
            }
        } catch (error) {
            console.error('Unexpected error during analysis:', error);
            setStatusText(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            setIsProcessing(false);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) return;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            {/* Debug buttons for testing individual components */}
                            {file && (
                                <div className="flex gap-4 mb-4">
                                    <button 
                                        type="button" 
                                        className="back-button"
                                        onClick={async () => {
                                            console.log("Testing PDF conversion...");
                                            const result = await convertPdfToImage(file);
                                            console.log("Conversion result:", result);
                                            if (result.error) {
                                                alert(`PDF conversion failed: ${result.error}`);
                                            } else {
                                                alert("PDF conversion successful!");
                                            }
                                        }}
                                    >
                                        Test PDF Conversion
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        className="back-button"
                                        onClick={async () => {
                                            console.log("Testing file upload...");
                                            try {
                                                const uploadedFile = await fs.upload([file]);
                                                console.log("Upload result:", uploadedFile);
                                                if (uploadedFile) {
                                                    alert("File upload successful!");
                                                } else {
                                                    alert("File upload failed!");
                                                }
                                            } catch (error) {
                                                console.error("Upload error:", error);
                                                alert(`Upload error: ${error}`);
                                            }
                                        }}
                                    >
                                        Test File Upload
                                    </button>
                                </div>
                            )}

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
};
export default Upload;